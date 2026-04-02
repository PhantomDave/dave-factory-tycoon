# Copilot Instructions

Apply these rules when generating code for **Dave Factory Tycoon** — a Roblox tycoon prototype built with roblox-ts.

---

## Architecture

```
src/server/   — ALL authoritative game logic, state mutation, model spawning
src/client/   — UI rendering, input handling, local-only effects
src/shared/   — types, constants, remotes (imported by both sides)
```

Never cross these boundaries:
- `server/` must not import from `client/`.
- `client/` must not import from `server/`.
- `shared/` must not import from `server/` or `client/`.

Absolute imports use `src/` as base (see `tsconfig.json`):

```ts
import { getRemotes } from "shared/remotes";     // ✅
import { logger }     from "server/utils/logger"; // ✅
```

---

## Key Files

| File | Role |
|---|---|
| `shared/types.ts` | `PlayerData`, `Upgrade`, `UPGRADES` registry, `PlaceRequest/Response`, grid types |
| `shared/constants.ts` | All tuning constants (`MINING_CONFIG`, `UPGRADE_CONFIG`, `PLOT_CONFIG`, etc.) |
| `shared/remotes.ts` | `getRemotes()` — the **only** place RemoteEvents are created or fetched |
| `server/main.server.ts` | Server entry — wires remote listeners, inits sell zones and placement |
| `server/upgrade.ts` | `onBuyUpgrade(player, upgradeId)` — canonical upgrade purchase flow |
| `server/data.ts` | `getPlayerData(player)` — in-memory `PlayerData` per player |
| `server/models/miners/baseMiner.ts` | Reference miner implementation |
| `server/models/miners/minerClass.ts` | Abstract `MinerClass` with `startMining()` / `stopMining()` |
| `server/requests/placement.ts` | `PlaceRequest` remote handler — validates grid, spawns model |
| `client/placementController.ts` | Ghost preview, click-to-place client logic |
| `client/ui/components/GameUI.tsx` | Root HUD (balance, multiplier) |
| `client/ui/components/UpgradeShop.tsx` | Shop panel — model for new shop components |

---

## Remotes

All typed in `shared/remotes.ts`. Never create RemoteEvents outside `getRemotes()`.

| Remote | Direction | Payload |
|---|---|---|
| `PlayerJoined` | Server → Client | _(none)_ |
| `BuyUpgrade` | Client → Server | `upgradeId: string` |
| `UpdateBalance` | Server → Client | `newBalance: number` |
| `UpdateMultiplier` | Server → Client | `newMultiplier: number` |
| `PlaceRequest` | Client → Server | `PlaceRequest` (machineType, coord, surfaceY, rotationQuarterTurns) |
| `PlaceResponse` | Server → Client | `PlaceResponse` (success, reason?) |

---

## Common Flows

### Buy upgrade
`UpgradeShop` → fires `BuyUpgrade` → `server/upgrade.ts::onBuyUpgrade` → validates, deducts coins, fires `UpdateBalance` + `UpdateMultiplier`.

### Place machine
`placementController` → fires `PlaceRequest` → `server/requests/placement.ts` → validates grid, spawns model, fires `PlaceResponse`.

### Mining loop
`BaseMiner.spawn()` → `startMining()` in `MinerClass` → spawns `WoodCube` every `MINING_CONFIG.BASE_INTERVAL_SECONDS` seconds.

---

## Preferred Practices

- Favor small composable functions — see `upgrade.ts` and `baseMiner.ts` for patterns.
- Keep React components in `src/client/ui/components` focused and single-purpose.
- Use `logger` from `server/utils/logger` — never `print()` or `warn()` directly.
- Reference `shared/constants.ts` by name for all tuning values; no inline magic numbers.
- Prefer explicit return types on exported functions.

---

## Safety

- Do **not** change `UPGRADE_CONFIG` or `MINING_CONFIG` values unless balance tuning is explicitly requested.
- Do **not** rename remote events without updating both sides and noting the migration.
- Do **not** use `any` or `unknown` where an existing typed alternative is available.
- Do **not** import Roblox services in `shared/` — keep it runtime-neutral.

---

## Verification

1. Run `npm run build` — must pass with zero errors.
2. Report any Roblox Studio manual checks needed (e.g., model placement, UI layout, in-game economy).
