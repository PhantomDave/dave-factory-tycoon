# GEMINI.md

Operational guidance for Gemini-based assistance on **Dave Factory Tycoon**.

---

## Project Facts

| Item | Value |
|---|---|
| Language | TypeScript (`strict: true`) via roblox-ts |
| Runtime | Roblox (Luau) |
| Build command | `npm run build` |
| Watch command | `npm run watch` |
| Package manager | Bun (`bun.lock` present) |
| UI | `@rbxts/react` + `@rbxts/react-roblox` |

---

## Directory Map

```
src/server/           — authoritative game logic, state, model spawning
  main.server.ts      — entry point
  upgrade.ts          — onBuyUpgrade handler
  data.ts             — in-memory PlayerData store
  grid.ts             — occupancy grid helpers
  plot.ts             — per-player plot management
  models/             — miner, conveyor, sell zone, product classes
  requests/           — remote request handlers (placement)
  services/           — player join/leave lifecycle
  utils/logger.ts     — logger.info/warn/error

src/client/           — UI, input handling, local-only effects
  main.client.tsx     — entry, mounts React UI
  placementController.ts — ghost preview + click-to-place

src/shared/           — cross-boundary contracts (no service calls)
  types.ts            — PlayerData, UPGRADES, PlaceRequest, grid types
  constants.ts        — MINING_CONFIG, UPGRADE_CONFIG, PLOT_CONFIG, etc.
  remotes.ts          — getRemotes() typed factory
  gridMath.ts         — coordinate math utilities
```

---

## Working Rules

1. **Never** import server modules from client or shared, or vice versa.
2. Use `getRemotes()` from `shared/remotes.ts` for all remote access — never create RemoteEvents inline.
3. Use absolute imports (`shared/remotes`, `server/data`) — `tsconfig` sets `baseUrl: "src"`.
4. Reference `shared/constants.ts` constants by name — no magic numbers.
5. Keep changes localized to the files the task actually requires.
6. Do not rename public symbols in `shared/` without updating all callers.
7. Do not change `UPGRADE_CONFIG` or `MINING_CONFIG` unless balance changes are explicitly requested.

---

## Remote Contracts

All remotes typed in `shared/remotes.ts`:

| Remote | Direction | Payload |
|---|---|---|
| `PlayerJoined` | S → C | _(none)_ |
| `BuyUpgrade` | C → S | `upgradeId: string` |
| `UpdateBalance` | S → C | `newBalance: number` |
| `UpdateMultiplier` | S → C | `newMultiplier: number` |
| `PlaceRequest` | C → S | `PlaceRequest` |
| `PlaceResponse` | S → C | `PlaceResponse` |

---

## Quality Bar

- `npm run build` must succeed with zero errors before proposing completion.
- Call out every Roblox Studio manual validation step needed (in-game behavior, model placement, UI rendering).
- Describe risks when touching server economy, upgrade logic, or grid/placement systems.
