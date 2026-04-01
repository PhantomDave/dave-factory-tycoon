# Grid-Based Machine Placement — Implementation Plan

**Issue:** [Sprint 2] Grid-based machine placement (client → server validation)
**Branch:** `Sprint-2-Grid-based-machine-placement-(client-→-server-validation)`

---

## 1. Background and Current State

The game currently spawns machines (miners, conveyors, sell zones) at the player's current
character position with no snapping, no overlap checking, and no boundary constraints.
Every object is parented directly to `Workspace`, making per-player enumeration impossible.
The client-to-server remotes carry no coordinate data; the server never validates placement.

This document describes every change required to replace that freeform placement with a
grid-snapping system that is validated server-side before any object is instanced.

---

## 2. Acceptance Criteria (from issue #10)

| # | Criterion |
|---|-----------|
| 1 | Client sends a typed `PlaceRequest` remote to the server containing machine type and grid coordinates. |
| 2 | Server validates the grid cell is within the plot boundary and is not already occupied. |
| 3 | On success the machine model is cloned from `ServerStorage` and parented to the player's plot `Folder`. |
| 4 | On failure the server fires a rejection event back to the client (no object is created). |
| 5 | `npm run build` passes with zero errors. |

---

## 3. Architecture Overview

```
Client                                   Server
──────                                   ──────
PlacementController                      PlacementHandler
  │  mouse.Hit → grid snap                 │  validate bounds
  │  ghost preview (green/red)             │  validate occupancy
  │  click → fire PlaceRequest ──remote──► │  mark cell occupied
  │  listen PlaceResponse ◄──remote──────  │  clone model → plot folder
  │  show success/error feedback           │  fire PlaceResponse
```

---

## 4. Shared Layer Changes (`src/shared/`)

### 4.1 `types.ts` — add grid types

```ts
// A 2-D integer coordinate on a player's plot grid.
export interface GridCoord {
  x: number;   // column index, 0-based, left-to-right
  z: number;   // row index,    0-based, front-to-back
}

// Payload sent by client when requesting a placement.
export interface PlaceRequest {
  machineType: string;   // must match a key in UPGRADES or "conveyor"
  coord: GridCoord;
}

// Payload sent by server in response.
export interface PlaceResponse {
  success: boolean;
  reason?: string;       // only present on failure
}

// Grid constants — single source of truth.
export const GRID_CELL_SIZE = 4;   // studs per cell (matches studio default grid)
export const GRID_COLS      = 20;  // columns per plot
export const GRID_ROWS      = 20;  // rows per plot
```

`GRID_CELL_SIZE = 4` matches the default Roblox Studio snap grid and keeps cell
boundaries aligned with most template models (which are typically 4×4 or 8×8 studs).

### 4.2 `remotes.ts` — add two new remotes

```ts
PlaceRequest:  TypedRemoteEvent<[request: PlaceRequest]>   // client → server
PlaceResponse: TypedRemoteEvent<[response: PlaceResponse]> // server → client
```

The existing `SpawnConveyor` remote can remain temporarily for backwards compatibility
during the transition, but `PlaceRequest` supersedes it.

---

## 5. Server Layer Changes (`src/server/`)

### 5.1 New file: `grid.ts`

This module owns the authoritative occupancy state and all grid math.

```ts
import { Players } from "@rbxts/services";
import { GridCoord, GRID_CELL_SIZE, GRID_COLS, GRID_ROWS } from "shared/types";
import { getPlotPosition, getPlayerPlot } from "./plot";

// Per-player set of occupied cells.  Key format: "x,z".
const occupancy = new Map<Player, Set<string>>();

// Called from data.ts when a player joins (after assignPlot).
export function initPlayerGrid(player: Player): void {
  occupancy.set(player, new Set());
}

// Called from data.ts when a player leaves (after releasePlot).
export function clearPlayerGrid(player: Player): void {
  occupancy.delete(player);
}

// Convert integer grid coord → world-space CFrame centred on that cell.
// The origin (0,0) cell is at the plot's registered Vector3 position.
export function gridCoordToWorld(player: Player, coord: GridCoord): CFrame {
  const origin = getPlotPosition(player);            // Vector3 from plot.ts
  const worldX = origin.X + coord.x * GRID_CELL_SIZE + GRID_CELL_SIZE / 2;
  const worldZ = origin.Z + coord.z * GRID_CELL_SIZE + GRID_CELL_SIZE / 2;
  return new CFrame(worldX, origin.Y, worldZ);
}

// Returns an error string if the placement is not legal, undefined if ok.
export function validatePlacement(player: Player, coord: GridCoord): string | undefined {
  if (coord.x < 0 || coord.x >= GRID_COLS || coord.z < 0 || coord.z >= GRID_ROWS) {
    return "Out of bounds";
  }
  const key = `${coord.x},${coord.z}`;
  if (occupancy.get(player)?.has(key)) {
    return "Cell already occupied";
  }
  return undefined;
}

// Mark a cell as occupied.  Must be called only after a successful placement.
export function occupyCell(player: Player, coord: GridCoord): void {
  const key = `${coord.x},${coord.z}`;
  occupancy.get(player)?.add(key);
}
```

**Why a string-keyed Set?**  Integer pairs cannot be used as JavaScript Map keys by
identity.  A `"x,z"` string is cheap to construct, human-readable in debug output, and
avoids a dependency on a 2-D array (which would require indexed access and a fixed
allocation at join time).

### 5.2 New file: `placement.ts`

Handles the `PlaceRequest` remote, replaces the ad-hoc logic in `upgrade.ts` for spawner
upgrades, and replaces the `SpawnConveyor` handler in `main.server.ts`.

```ts
import { Players, ServerStorage } from "@rbxts/services";
import { getRemotes } from "shared/remotes";
import { UPGRADES } from "shared/types";
import { getPlayerPlot } from "./plot";
import { validatePlacement, occupyCell, gridCoordToWorld } from "./grid";
import { BaseMiner } from "./Models/Miners/BaseMiner";
import { BaseConveyor } from "./Models/Conveyors/BaseConveyor";

export function initPlacementHandler(): void {
  const remotes = getRemotes();

  remotes.PlaceRequest.OnServerEvent.Connect((player, request) => {
    const { machineType, coord } = request;

    // 1. Validate the cell.
    const error = validatePlacement(player, coord);
    if (error !== undefined) {
      remotes.PlaceResponse.FireClient(player, { success: false, reason: error });
      return;
    }

    // 2. Resolve the target CFrame and plot folder.
    const worldCFrame = gridCoordToWorld(player, coord);
    const plotFolder  = getPlayerPlot(player);

    // 3. Attempt to spawn the requested machine type.
    const spawned = spawnMachine(machineType, player, worldCFrame, plotFolder);
    if (!spawned) {
      remotes.PlaceResponse.FireClient(player, { success: false, reason: "Unknown machine type" });
      return;
    }

    // 4. Mark the cell occupied only after a confirmed spawn.
    occupyCell(player, coord);
    remotes.PlaceResponse.FireClient(player, { success: true });
  });
}

function spawnMachine(
  machineType: string,
  player: Player,
  cframe: CFrame,
  plotFolder: Folder,
): boolean {
  // Delegates to the existing class-based spawn system.
  // Each class's spawnModel is updated below to accept a CFrame and a parent folder.
  if (machineType === "BaseMiner") {
    const miner = new BaseMiner("BaseMiner", player.UserId);
    miner.spawn(cframe, plotFolder);
    return true;
  }
  if (machineType === "Conveyor") {
    const conveyor = new BaseConveyor();
    conveyor.spawn(cframe, plotFolder);
    return true;
  }
  if (machineType === "SellZone") {
    spawnTemplateModel("SellZone", cframe, plotFolder);
    return true;
  }
  return false;
}
```

### 5.3 `spawnUtils.ts` — update signature

Change `spawnTemplateModel` to accept `CFrame` instead of `Vector3` (so that future
rotated placements work without a separate overload), and add an optional `parent`
parameter defaulting to `Workspace`:

```ts
// Before:
export function spawnTemplateModel(templateName: string, position: Vector3): Model

// After:
export function spawnTemplateModel(
  templateName: string,
  cframe: CFrame,
  parent: Instance = Workspace,
): Model
```

Inside the function replace `model.PivotTo(new CFrame(position))` with
`model.PivotTo(cframe)` and replace the hard-coded `Workspace` parent with `parent`.

### 5.4 `MinerClass.ts` and `ConveyorClass.ts` — update `spawn` signatures

```ts
// Before:
spawn(position: Vector3): void

// After:
spawn(cframe: CFrame, parent: Instance): void
```

Both classes forward the arguments straight to `spawnTemplateModel`, so the change is
purely a signature update plus the call-site update.

### 5.5 `data.ts` — wire grid lifecycle

In `onPlayerAdded`, after `assignPlot(player)`:
```ts
initPlayerGrid(player);
```

In `onPlayerRemoving`, before or after `releasePlot(player)`:
```ts
clearPlayerGrid(player);
```

### 5.6 `main.server.ts` — replace legacy spawn handlers

Remove the raw `SpawnConveyor` handler and remove the in-line spawner calls that were
previously triggered from `upgrade.ts`.  Replace both with a single call:

```ts
initPlacementHandler();
```

The `BuyUpgrade` flow can remain for multiplier upgrades (which have no spatial
component); only the `"spawner"` type upgrades are rerouted through `PlaceRequest`.

---

## 6. Client Layer Changes (`src/client/`)

### 6.1 New file: `PlacementController.ts`

This module activates when the player selects a machine to place (from the shop UI) and
deactivates on placement or cancel.

```
State machine:
  IDLE ──(selectMachine)──► PLACING ──(click/cancel)──► IDLE
```

**In PLACING state:**

1. Create a semi-transparent ghost model by cloning the template from
   `ReplicatedStorage` and setting all `BasePart` `Transparency` to `0.5` and
   `CanCollide` to `false`.
2. Each `RunService.RenderStepped`:
   a. Cast a `Mouse.UnitRay` against the plot surface using `WorldRoot:Raycast`.
   b. Convert the hit point to a grid coord:
      ```
      localX = (hit.X - plotOrigin.X) / GRID_CELL_SIZE
      localZ = (hit.Z - plotOrigin.Z) / GRID_CELL_SIZE
      gridX  = math.floor(localX)
      gridZ  = math.floor(localZ)
      ```
   c. Compute the snapped world position and move the ghost to
      `gridCoordToWorld(gridX, gridZ)` (a client-side re-implementation of the same
      math in `grid.ts`).
   d. Colour the ghost green if the cell is in-bounds and not in the local known
      occupancy cache; red otherwise.
3. On `Mouse.Button1Down`:
   a. Fire `PlaceRequest` remote with `{ machineType, coord: { x: gridX, z: gridZ } }`.
   b. Destroy the ghost immediately (optimistic UX).
   c. Listen for `PlaceResponse`; if `success = false`, show an error toast and
      optionally restore the ghost for a retry.
4. On `Mouse.Button2Down` or pressing `Escape`: cancel — destroy ghost, return to IDLE.

**Why optimistic ghost removal?**  Network round-trips at ~100 ms feel sluggish if the
player must wait for the ghost to disappear.  Removing it immediately on click and
showing an error only on rejection keeps the feel responsive while still giving the
server the final say.

### 6.2 `GameUI.tsx` — connect shop selection to PlacementController

Currently the shop's "Buy" button fires `BuyUpgrade` directly.  For spawner-type
upgrades, change it to call `PlacementController.beginPlacing(machineType)` instead.
Multiplier upgrades still fire `BuyUpgrade` unchanged.

The distinction is: if `UPGRADES[id].type === "spawner"`, activate placement mode;
otherwise fire the upgrade remote immediately.

### 6.3 Plot origin on the client

The client needs the plot origin `Vector3` to do its local grid math.  Two options:

**Option A (recommended):** The server already creates a `Folder` in `Workspace` with a
`PlotPosition` attribute.  The client can read that attribute:
```ts
const plotFolder = Workspace.FindFirstChild(`Plot_${plotIndex}`) as Folder;
const origin = plotFolder.GetAttribute("PlotPosition") as Vector3;
```

**Option B:** Fire an additional `UpdatePlotPosition` remote from server to client on join.

Option A requires no new remote and uses data the server already replicates.  Use Option A.

---

## 7. File Change Summary

| File | Change type | Description |
|------|-------------|-------------|
| `src/shared/types.ts` | Modify | Add `GridCoord`, `PlaceRequest`, `PlaceResponse`, grid constants |
| `src/shared/remotes.ts` | Modify | Add `PlaceRequest` and `PlaceResponse` remotes |
| `src/server/grid.ts` | **New** | Occupancy map, grid math, validation |
| `src/server/placement.ts` | **New** | `PlaceRequest` handler, machine dispatch |
| `src/server/spawnUtils.ts` | Modify | Accept `CFrame` + `parent`; update callers |
| `src/server/Models/Miners/MinerClass.ts` | Modify | `spawn(cframe, parent)` signature |
| `src/server/Models/Conveyors/ConveyorClass.ts` | Modify | `spawn(cframe, parent)` signature |
| `src/server/data.ts` | Modify | Wire `initPlayerGrid` / `clearPlayerGrid` |
| `src/server/main.server.ts` | Modify | Call `initPlacementHandler()`; remove legacy handlers |
| `src/server/upgrade.ts` | Modify | Remove spawner branches (rerouted through `placement.ts`) |
| `src/client/PlacementController.ts` | **New** | Ghost model, ray-cast, grid snapping, remote fire |
| `src/client/ui/components/GameUI.tsx` | Modify | Route spawner upgrades through `PlacementController` |

---

## 8. Testing Checklist (in Studio)

- [ ] Player joins → plot is assigned, occupancy map is initialised, plot folder is visible in Workspace.
- [ ] Clicking a spawner upgrade in the shop activates placement mode (ghost appears).
- [ ] Ghost snaps to grid cells and turns red over occupied or out-of-bounds cells.
- [ ] Left-click on a valid cell fires the remote and the machine appears at the correct snapped position, parented inside the plot folder.
- [ ] Left-click on an occupied cell is rejected by the server; ghost re-appears or an error message is shown.
- [ ] Left-click outside the plot boundary is rejected.
- [ ] Right-click or Escape cancels placement mode with no machine spawned.
- [ ] Player leaves → plot folder is destroyed, occupancy map entry is removed.
- [ ] `npm run build` passes with zero TypeScript errors.

---

## 9. Out of Scope for This Sprint

- Multi-cell (2×2 or larger) footprint machines.
- Machine rotation on placement.
- Removing or selling already-placed machines (grid cell release).
- Persisting the occupancy map across server restarts.
- Networked synchronisation of occupancy state to other clients (only the owning client and server need it for now).
