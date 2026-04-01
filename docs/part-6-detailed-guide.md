# Part 6: Client Layer Implementation - Detailed Learning Guide

> **Goal**: Implement the client-side placement system with ghost previews, grid snapping, and server communication.

## Current Status

✅ Server grid system implemented (`grid.ts`)
✅ Shared types and remotes defined
🔲 Client PlacementController (this guide)
🔲 Updated GameUI to connect to placement system
🔲 Client-side plot origin detection

---

## 6.1: PlacementController.ts - Step by Step

### Understanding the State Machine

Before writing code, understand that placement has two states:

- **IDLE**: Normal gameplay, no placement active
- **PLACING**: Player has selected a machine to place, ghost follows mouse

```
IDLE ──(shop selection)──► PLACING ──(click/cancel)──► IDLE
```

### Step 1: Basic Module Structure

Create the foundation in `/src/client/placementController.ts`:

```ts
import { Players, ReplicatedStorage, RunService, UserInputService, Workspace } from "@rbxts/services";
import { GridCoord, PlaceRequest, GRID_CELL_SIZE, GRID_COLS, GRID_ROWS } from "shared/types";
import { getRemotes } from "shared/remotes";

// State management
enum PlacementState {
	IDLE = "IDLE",
	PLACING = "PLACING",
}

class PlacementController {
	private state = PlacementState.IDLE;
	private currentMachineType?: string;
	private ghostModel?: Model;
	private mouse = Players.LocalPlayer.GetMouse();
	private remotes = getRemotes();

	// We'll add methods here step by step
}

// Singleton instance
export const placementController = new PlacementController();
```

**Learning Notes:**

- `enum` helps prevent typos and makes state changes clear
- The `?` in `currentMachineType?` means optional - it's undefined when IDLE
- We get the mouse early since we'll use it frequently

### Step 2: Public Interface - Starting Placement

Add the method that the shop UI will call:

```ts
class PlacementController {
	// ... previous code ...

	/**
	 * Called by shop UI when player selects a machine to place
	 * @param machineType The type of machine (e.g. "BaseMiner", "SellZone")
	 */
	public beginPlacing(machineType: string): void {
		if (this.state === PlacementState.PLACING) {
			this.cancelPlacing(); // Clean up any existing placement
		}

		this.state = PlacementState.PLACING;
		this.currentMachineType = machineType;
		this.createGhostModel(machineType);
		this.connectMouseEvents();

		print(`Started placing: ${machineType}`);
	}

	/**
	 * Cancels current placement and returns to idle
	 */
	public cancelPlacing(): void {
		if (this.state === PlacementState.IDLE) return;

		this.state = PlacementState.IDLE;
		this.currentMachineType = undefined;
		this.destroyGhostModel();
		this.disconnectMouseEvents();

		print("Placement cancelled");
	}
}
```

**Learning Notes:**

- Public methods use `public` (though it's the default in TypeScript)
- We always clean up before starting new placement
- `print()` helps you debug in Roblox Studio's Output window

### Step 3: Ghost Model Creation

The ghost is a preview that shows where the machine will be placed:

```ts
class PlacementController {
	// ... previous code ...

	private createGhostModel(machineType: string): void {
		// Find the template model in ReplicatedStorage
		const template = ReplicatedStorage.FindFirstChild(machineType);
		if (!template || !template.IsA("Model")) {
			warn(`Template ${machineType} not found in ReplicatedStorage`);
			return;
		}

		// Clone and make it ghostly
		this.ghostModel = template.Clone();
		this.ghostModel.Name = `${machineType}_Ghost`;
		this.ghostModel.Parent = Workspace;

		// Make all parts semi-transparent and non-collidable
		this.makeGhostly(this.ghostModel);
	}

	private makeGhostly(model: Model): void {
		for (const descendant of model.GetDescendants()) {
			if (descendant.IsA("BasePart")) {
				descendant.Transparency = 0.5;
				descendant.CanCollide = false;
			}
		}
	}

	private destroyGhostModel(): void {
		if (this.ghostModel) {
			this.ghostModel.Destroy();
			this.ghostModel = undefined;
		}
	}
}
```

**Learning Notes:**

- `FindFirstChild()` returns Instance | undefined, so we check it exists
- `IsA("Model")` is type checking in Roblox - ensures it's actually a Model
- `GetDescendants()` finds all children, grandchildren, etc.
- Setting `CanCollide = false` prevents the ghost from blocking movement

### Step 4: Plot Origin Detection

The client needs to know where the player's plot is located:

```ts
class PlacementController {
	// ... previous code ...

	/**
	 * Gets the player's plot origin position for grid calculations
	 */
	private getPlotOrigin(): Vector3 | undefined {
		const player = Players.LocalPlayer;
		const plotNumber = player.GetAttribute("PlotNumber") as number | undefined;

		if (plotNumber === undefined) {
			warn("Player has no assigned plot");
			return undefined;
		}

		// Find the plot folder in workspace
		const plotFolder = Workspace.FindFirstChild(`Plot_${plotNumber}`);
		if (!plotFolder || !plotFolder.IsA("Folder")) {
			warn(`Plot folder Plot_${plotNumber} not found`);
			return undefined;
		}

		// Get the position from the folder's attribute
		const position = plotFolder.GetAttribute("PlotPosition") as Vector3 | undefined;
		if (!position) {
			warn("Plot folder missing PlotPosition attribute");
			return undefined;
		}

		return position;
	}
}
```

**Learning Notes:**

- We use attributes to store data on Roblox objects
- Multiple checks ensure we handle missing/invalid data gracefully
- `warn()` shows yellow text in Output - helps debug issues

### Step 5: Grid Math - World to Grid and Back

Convert between world coordinates and grid coordinates:

```ts
class PlacementController {
	// ... previous code ...

	/**
	 * Converts world position to grid coordinates
	 */
	private worldToGrid(worldPos: Vector3, plotOrigin: Vector3): GridCoord {
		const localX = (worldPos.X - plotOrigin.X) / GRID_CELL_SIZE;
		const localZ = (worldPos.Z - plotOrigin.Z) / GRID_CELL_SIZE;

		return {
			x: math.floor(localX),
			z: math.floor(localZ),
		};
	}

	/**
	 * Converts grid coordinates to world position (center of cell)
	 */
	private gridToWorld(coord: GridCoord, plotOrigin: Vector3): CFrame {
		const worldX = plotOrigin.X + coord.x * GRID_CELL_SIZE + GRID_CELL_SIZE / 2;
		const worldZ = plotOrigin.Z + coord.z * GRID_CELL_SIZE + GRID_CELL_SIZE / 2;
		return new CFrame(worldX, plotOrigin.Y, worldZ);
	}

	/**
	 * Checks if coordinates are within plot bounds
	 */
	private isValidGridCoord(coord: GridCoord): boolean {
		return coord.x >= 0 && coord.x < GRID_COLS && coord.z >= 0 && coord.z < GRID_ROWS;
	}
}
```

**Learning Notes:**

- `math.floor()` rounds down to get integer grid coordinates
- We add `GRID_CELL_SIZE / 2` to center objects in cells
- The Y coordinate stays at plot origin Y (ground level)

### Step 6: Mouse Events and Real-time Updates

Handle mouse movement and clicking:

```ts
class PlacementController {
	// ... previous code ...

	private renderConnection?: RBXScriptConnection;
	private clickConnection?: RBXScriptConnection;
	private rightClickConnection?: RBXScriptConnection;

	private connectMouseEvents(): void {
		// Update ghost position every frame
		this.renderConnection = RunService.RenderStepped.Connect(() => {
			this.updateGhostPosition();
		});

		// Handle left click (place)
		this.clickConnection = this.mouse.Button1Down.Connect(() => {
			this.handleLeftClick();
		});

		// Handle right click (cancel)
		this.rightClickConnection = this.mouse.Button2Down.Connect(() => {
			this.cancelPlacing();
		});
	}

	private disconnectMouseEvents(): void {
		this.renderConnection?.Disconnect();
		this.clickConnection?.Disconnect();
		this.rightClickConnection?.Disconnect();

		this.renderConnection = undefined;
		this.clickConnection = undefined;
		this.rightClickConnection = undefined;
	}
}
```

**Learning Notes:**

- `RenderStepped` runs every frame - about 60 times per second
- We store connections so we can disconnect them later
- `?.Disconnect()` only calls if connection exists (optional chaining)

### Step 7: Ghost Positioning with Raycasting

Make the ghost follow the mouse and snap to grid:

```ts
class PlacementController {
	// ... previous code ...

	private updateGhostPosition(): void {
		if (!this.ghostModel || this.state !== PlacementState.PLACING) return;

		const plotOrigin = this.getPlotOrigin();
		if (!plotOrigin) return;

		// Cast a ray from camera through mouse position
		const camera = Workspace.CurrentCamera!;
		const unitRay = camera.ScreenPointToRay(this.mouse.X, this.mouse.Y);

		const raycastParams = new RaycastParams();
		raycastParams.FilterType = Enum.RaycastFilterType.Blacklist;
		raycastParams.FilterDescendantsInstances = [this.ghostModel]; // Don't hit our own ghost

		const raycastResult = Workspace.Raycast(unitRay.Origin, unitRay.Direction.mul(1000), raycastParams);

		if (raycastResult) {
			// Convert hit point to grid coordinates
			const gridCoord = this.worldToGrid(raycastResult.Position, plotOrigin);

			// Snap to grid center
			const snappedCFrame = this.gridToWorld(gridCoord, plotOrigin);
			this.ghostModel.PivotTo(snappedCFrame);

			// Color the ghost based on validity
			const isValid = this.isValidGridCoord(gridCoord);
			this.colorGhost(isValid);
		}
	}

	private colorGhost(isValid: boolean): void {
		if (!this.ghostModel) return;

		const color = isValid ? Color3.fromRGB(0, 255, 0) : Color3.fromRGB(255, 0, 0);

		for (const descendant of this.ghostModel.GetDescendants()) {
			if (descendant.IsA("BasePart")) {
				descendant.Color = color;
			}
		}
	}
}
```

**Learning Notes:**

- `ScreenPointToRay()` converts mouse position to a 3D ray
- We multiply direction by 1000 to make the ray long enough
- Blacklist filtering prevents the ray from hitting the ghost itself
- Green = valid placement, Red = invalid

### Step 8: Placing the Machine

Handle actual placement when player clicks:

```ts
class PlacementController {
	// ... previous code ...

	private handleLeftClick(): void {
		if (this.state !== PlacementState.PLACING || !this.currentMachineType) return;

		const plotOrigin = this.getPlotOrigin();
		if (!plotOrigin) return;

		// Get current grid position
		const camera = Workspace.CurrentCamera!;
		const unitRay = camera.ScreenPointToRay(this.mouse.X, this.mouse.Y);

		const raycastParams = new RaycastParams();
		raycastParams.FilterType = Enum.RaycastFilterType.Blacklist;
		raycastParams.FilterDescendantsInstances = [this.ghostModel!];

		const raycastResult = Workspace.Raycast(unitRay.Origin, unitRay.Direction.mul(1000), raycastParams);

		if (raycastResult) {
			const gridCoord = this.worldToGrid(raycastResult.Position, plotOrigin);

			// Only place if valid
			if (this.isValidGridCoord(gridCoord)) {
				this.sendPlaceRequest(gridCoord);
				this.destroyGhostModel(); // Optimistic - remove ghost immediately
			} else {
				print("Cannot place here - invalid location");
			}
		}
	}

	private sendPlaceRequest(coord: GridCoord): void {
		if (!this.currentMachineType) return;

		const request: PlaceRequest = {
			machineType: this.currentMachineType,
			coord: coord,
		};

		print(`Sending place request: ${this.currentMachineType} at (${coord.x}, ${coord.z})`);
		this.remotes.PlaceRequest.FireServer(request);

		// Listen for response
		const connection = this.remotes.PlaceResponse.OnClientEvent.Connect((response) => {
			connection.Disconnect(); // Only handle the first response
			this.handlePlaceResponse(response);
		});
	}

	private handlePlaceResponse(response: { success: boolean; reason?: string }): void {
		if (response.success) {
			print("Machine placed successfully!");
			this.cancelPlacing(); // Return to idle state
		} else {
			print(`Placement failed: ${response.reason || "Unknown error"}`);
			// Optionally: recreate ghost for retry
			if (this.currentMachineType) {
				this.createGhostModel(this.currentMachineType);
			}
		}
	}
}
```

**Learning Notes:**

- We do the same raycast calculation as in positioning
- "Optimistic" means we assume success and remove ghost immediately
- We disconnect the response handler after first use to avoid memory leaks

---

## 6.2: Update GameUI.tsx - Connect to PlacementController

### Current vs New Flow

**Current**: Shop button → fire remote directly
**New**: Shop button → start placement mode → user clicks in world → fire remote

### Step 1: Import the Controller

In `/src/client/ui/components/GameUI.tsx`:

```tsx
import { placementController } from "client/placementController";
```

### Step 2: Update Props Interface

Remove the old conveyor callback, add placement callback:

```tsx
interface GameUIProps {
	balance: number;
	multiplier: number;
	shopOpen: boolean;
	onToggleShop: () => void;
	onBuyUpgrade: (upgradeId: string) => void;
	// Remove this line:
	// onSpawnConveyor: () => void;

	// Add this:
	onStartPlacement: (machineType: string) => void;
}
```

### Step 3: Update the Component

Replace the "Spawn Conveyor" button with placement buttons:

```tsx
export const GameUI: React.FC<GameUIProps> = ({
	balance,
	multiplier,
	shopOpen,
	onToggleShop,
	onBuyUpgrade,
	onStartPlacement, // New prop
}) => {
	return (
		<screengui ResetOnSpawn={false}>
			{/* Balance and multiplier labels stay the same */}

			{/* Shop toggle button stays the same */}

			{/* Replace the Spawn Conveyor button with placement buttons */}
			<textbutton
				Size={new UDim2(0, 250, 0, 50)}
				Position={new UDim2(0, 20, 0, 240)}
				BackgroundColor3={Color3.fromRGB(100, 200, 100)}
				TextColor3={Color3.fromRGB(255, 255, 255)}
				TextSize={22}
				Font={Enum.Font.GothamBold}
				Text="Place Miner"
				Event={{
					Activated: () => onStartPlacement("BaseMiner"),
				}}
			/>
			<textbutton
				Size={new UDim2(0, 250, 0, 50)}
				Position={new UDim2(0, 20, 0, 300)}
				BackgroundColor3={Color3.fromRGB(200, 100, 200)}
				TextColor3={Color3.fromRGB(255, 255, 255)}
				TextSize={22}
				Font={Enum.Font.GothamBold}
				Text="Place Sell Zone"
				Event={{
					Activated: () => onStartPlacement("SellZone"),
				}}
			/>

			{shopOpen && <UpgradeShop balance={balance} onBuyUpgrade={onBuyUpgrade} />}
		</screengui>
	);
};
```

### Step 4: Update the Main Client File

In `/src/client/main.client.tsx`, update the callback:

```tsx
// Find the GameUI component usage and update it:
<GameUI
	balance={balance}
	multiplier={multiplier}
	shopOpen={shopOpen}
	onToggleShop={() => setShopOpen(!shopOpen)}
	onBuyUpgrade={handleBuyUpgrade}
	onStartPlacement={(machineType) => {
		placementController.beginPlacing(machineType);
	}}
/>
```

---

## 6.3: Advanced Features (Optional)

### Escape Key Cancelling

Add keyboard input to cancel placement:

```ts
// In PlacementController connectMouseEvents():
this.keyConnection = UserInputService.InputBegan.Connect((input) => {
	if (input.KeyCode === Enum.KeyCode.Escape) {
		this.cancelPlacing();
	}
});
```

### Occupancy Cache

Track placed machines on client to show red immediately:

```ts
class PlacementController {
	private occupiedCells = new Set<string>();

	// After successful placement:
	private handlePlaceResponse(response: { success: boolean; reason?: string }): void {
		if (response.success && this.currentGridCoord) {
			const key = `${this.currentGridCoord.x},${this.currentGridCoord.z}`;
			this.occupiedCells.add(key);
		}
		// ... rest of method
	}

	// In isValidGridCoord check:
	private isValidGridCoord(coord: GridCoord): boolean {
		const inBounds = coord.x >= 0 && coord.x < GRID_COLS && coord.z >= 0 && coord.z < GRID_ROWS;
		const key = `${coord.x},${coord.z}`;
		const notOccupied = !this.occupiedCells.has(key);
		return inBounds && notOccupied;
	}
}
```

---

## Testing Your Implementation

1. **Start Placement Mode**: Click "Place Miner" - you should see a ghost miner appear
2. **Ghost Movement**: Move mouse around - ghost should follow and snap to grid
3. **Color Feedback**: Ghost should be green over empty cells, red over occupied/out-of-bounds
4. **Successful Placement**: Left-click on green area - machine should appear, ghost disappears
5. **Cancelling**: Right-click or Escape should cancel placement
6. **Server Validation**: Try placing in same spot twice - second should fail

## Common Issues and Solutions

**Ghost doesn't appear**: Check ReplicatedStorage has your machine templates
**Ghost doesn't follow mouse**: Ensure RunService connection is active
**Placement always fails**: Verify server grid system is working
**Wrong position**: Check plot origin calculation and grid math

---

This guide gives you the complete client-side implementation with explanations of how each part works. Take your time implementing each step and test frequently!
