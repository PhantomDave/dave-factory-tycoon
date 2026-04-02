# AGENTS Guide

Repository-specific coding expectations for all AI agents working on **Dave Factory Tycoon** — a Roblox tycoon prototype built with [roblox-ts](https://roblox-ts.com/).

---

## Project Layout

```
src/
  server/
    main.server.ts            # Entry point: wires remotes and initializes systems
    upgrade.ts                # onBuyUpgrade() — purchase + spawner handler
    data.ts                   # In-memory PlayerData store (getPlayerData)
    grid.ts                   # Occupancy grid helpers
    plot.ts                   # Per-player plot management
    models/
      miners/
        baseMiner.ts          # BaseMiner extends MinerClass (spawns WoodCubes)
        minerClass.ts         # Abstract MinerClass — startMining / stopMining loop
      conveyors/
        baseConveyor.ts       # Conveyor base
        conveyorClass.ts      # Movement logic for conveyor belt parts
      products/
        woodCube.ts           # WoodCube product — lifetime & cleanup
        Products.d.ts         # Product type declarations
      sellZone.ts             # Sell zone — detects products, awards coins
      spawnUtils.ts           # getPlayerSpawnPosition, spawnTemplateModel
    requests/
      placement.ts            # Server handler for PlaceRequest remote
    services/
      playerService.ts        # Player join / leave lifecycle
    utils/
      logger.ts               # logger.info / logger.warn / logger.error
  client/
    main.client.tsx           # Client entry: mounts React UI, wires remotes
    placementController.ts    # Ghost-preview and click-to-place client logic
    ui/
      components/
        GameUI.tsx            # Root HUD (balance, multiplier display)
        UpgradeShop.tsx       # Shop panel — lists and purchases upgrades
  shared/
    types.ts                  # PlayerData, Upgrade, PlaceRequest, UPGRADES map
    constants.ts              # MINING_CONFIG, UPGRADE_CONFIG, PLOT_CONFIG, etc.
    remotes.ts                # Typed RemoteEvent factory (getRemotes)
    gridMath.ts               # Grid coordinate math utilities
```

---

## Architecture Rules

| Layer | Responsibility |
|---|---|
| `src/server` | All game state, economy, and model spawning |
| `src/client` | UI rendering, input handling, local prediction |
| `src/shared` | Types, constants, and remote contracts only |

- **Never** import `server/` modules from `client/` or `shared/`.
- **Never** import `client/` modules from `server/` or `shared/`.
- Remote names and payload shapes are defined in `shared/remotes.ts` — do not redefine them inline.

---

## Remotes (defined in `shared/remotes.ts`)

| Remote | Direction | Payload |
|---|---|---|
| `PlayerJoined` | Server → Client | _(none)_ |
| `BuyUpgrade` | Client → Server | `upgradeId: string` |
| `UpdateBalance` | Server → Client | `newBalance: number` |
| `UpdateMultiplier` | Server → Client | `newMultiplier: number` |
| `PlaceRequest` | Client → Server | `PlaceRequest` |
| `PlaceResponse` | Server → Client | `PlaceResponse` |

Always use `getRemotes()` from `shared/remotes.ts` — never create RemoteEvent instances directly.

---

## Key Constants (`shared/constants.ts`)

| Export | Fields |
|---|---|
| `MINING_CONFIG` | `BASE_INTERVAL_SECONDS`, `UPGRADED_INTERVAL_SECONDS`, `MAX_MINERS_PER_PLAYER` |
| `UPGRADE_CONFIG` | `basicPickaxe.{cost,multiplier}`, `goldPickaxe.{cost,multiplier}` |
| `PLOT_CONFIG` | `SPACING`, `MAX_PLOTS` |
| `PRODUCT_CONFIG` | `woodCube.lifetime` |
| `CONVEYOR_CONFIG` | `baseSpeed`, `updateInterval` |
| `SELL_ZONE_CONFIG` | `glowRange`, `glowBrightness` |

Do **not** change these values unless the task explicitly asks for balance changes.

---

## Code Style

- TypeScript `strict: true` is enforced — no `any` or `unknown` where a typed alternative exists.
- Use absolute imports (`server/...`, `shared/...`) — `tsconfig.json` sets `baseUrl: "src"`.
- Follow naming patterns of the surrounding file.
- Add comments only for non-obvious logic; match the existing comment style.
- Prefer small, composable functions over large handlers (see `upgrade.ts` and `baseMiner.ts`).

---

## Adding New Features

### New miner type
1. Create `src/server/models/miners/<name>Miner.ts` extending `MinerClass`.
2. Add a size entry in `MACHINE_SIZES` in `shared/types.ts`.
3. Add a `spawner` upgrade entry in `UPGRADES` in `shared/types.ts` if needed.

### New upgrade
1. Add a constant entry in `UPGRADE_CONFIG` (`shared/constants.ts`).
2. Add a corresponding entry in `UPGRADES` (`shared/types.ts`).
3. Handle the new `type` in `onBuyUpgrade` (`server/upgrade.ts`).

### New remote
1. Define the typed interface in `shared/remotes.ts`.
2. Call `ensureRemote` inside `getRemotes()`.
3. Wire server listener in `server/main.server.ts` or the relevant service.
4. Fire from the client with the typed payload.

---

## Validation

Before proposing completion:

1. Run `npm run build` — must pass with no errors.
2. List any manual Roblox Studio verification steps still required.

---

## Pull Request Hygiene

- Branch names: `feature/<short-description>` or `fix/<short-description>`.
- PR description: summarize **behavior** changes, not just file diffs.
- Include testing notes for in-game behavior that cannot be verified by CI.
- Mention risks and any follow-up work when relevant.
