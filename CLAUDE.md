# CLAUDE.md

Repository guidance for Claude when working on **Dave Factory Tycoon**.

---

## Project at a Glance

| Item | Value |
|---|---|
| Language | TypeScript via [roblox-ts](https://roblox-ts.com/) |
| Runtime | Roblox (Luau under the hood) |
| UI framework | `@rbxts/react` + `@rbxts/react-roblox` |
| Build | `npm run build` (runs `rbxtsc`) |
| Watch | `npm run watch` |
| Bun lockfile | `bun.lock` — project uses Bun as package manager |

---

## Source Tree

```
src/server/   — all authoritative game logic and state
src/client/   — UI, input, local effects only
src/shared/   — types, constants, remotes (no Roblox service calls here)
```

Absolute imports are enabled via `tsconfig.json` `baseUrl: "src"`:

```ts
import { getRemotes } from "shared/remotes";   // ✅
import { getRemotes } from "../../shared/remotes"; // ❌ avoid
```

---

## Key Files to Know

| File | What it does |
|---|---|
| `shared/types.ts` | `PlayerData`, `Upgrade`, `UPGRADES` map, `PlaceRequest/Response`, grid types |
| `shared/constants.ts` | All tuning constants — never hardcode magic numbers |
| `shared/remotes.ts` | `getRemotes()` factory; defines all typed RemoteEvents |
| `server/main.server.ts` | Entry point: initializes remotes, sell zones, placement handler |
| `server/upgrade.ts` | `onBuyUpgrade()` — validates funds, applies upgrade, fires client events |
| `server/data.ts` | `getPlayerData()` — in-memory player state |
| `server/models/miners/baseMiner.ts` | Reference implementation for a miner |
| `server/models/miners/minerClass.ts` | Abstract base with `startMining()` / `stopMining()` |
| `client/main.client.tsx` | Mounts React tree, connects client-side remote listeners |
| `client/ui/components/UpgradeShop.tsx` | Upgrade shop UI — follow for new shop panels |

---

## Conventions

### State mutations
All player state (`PlayerData`) lives in `server/data.ts`. Mutate only from server code.

### Remotes
Use `getRemotes()` from `shared/remotes.ts`. Never create or find RemoteEvents by string outside that file.

### Constants
All tuning values (`MINING_CONFIG`, `UPGRADE_CONFIG`, etc.) live in `shared/constants.ts`. Reference them by name — do not duplicate.

### Upgrade flow
`client` fires `BuyUpgrade` → `server/upgrade.ts::onBuyUpgrade` validates, deducts coins, applies effect, fires `UpdateBalance` / `UpdateMultiplier` back.

### Placement flow
`client/placementController.ts` fires `PlaceRequest` → `server/requests/placement.ts` validates grid, spawns model, fires `PlaceResponse`.

---

## Change Discipline

- Keep diffs narrow: touch only the files required by the task.
- Do **not** rename public symbols in `shared/` without updating all callers.
- Do **not** change constants in `shared/constants.ts` unless balance tuning is explicitly requested.
- Add comments only for non-obvious logic; match the existing terse style.

---

## Validation

1. `npm run build` — must produce zero TypeScript errors.
2. List any Roblox Studio manual checks the reviewer should perform (e.g., "verify miner spawns on correct plot in-game").
