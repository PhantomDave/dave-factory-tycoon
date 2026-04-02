# Dave Factory Tycoon

A Roblox tycoon prototype built with [roblox-ts](https://roblox-ts.com/) and React. Players place miners, conveyors, and sell zones on their plot to automate resource production and earn coins.

---

## Tech Stack

| Tool | Purpose |
|---|---|
| [roblox-ts](https://roblox-ts.com/) | TypeScript → Luau compiler for Roblox |
| [@rbxts/react](https://github.com/littensy/rbxts-react) | React UI framework for Roblox |
| [@rbxts/react-roblox](https://github.com/littensy/rbxts-react) | React renderer for Roblox GUIs |
| [@rbxts/services](https://github.com/roblox-ts/services) | Typed Roblox service bindings |
| Bun | Package manager (`bun.lock`) |

---

## Project Structure

```
src/
  server/
    main.server.ts            ← Entry point: inits remotes, sell zones, placement
    upgrade.ts                ← onBuyUpgrade() — validates funds, applies upgrade
    data.ts                   ← getPlayerData() — in-memory PlayerData store
    grid.ts                   ← Occupancy grid helpers (cell tracking)
    plot.ts                   ← Per-player plot management
    models/
      miners/
        baseMiner.ts          ← BaseMiner: spawns WoodCubes on an interval
        minerClass.ts         ← Abstract MinerClass: startMining / stopMining
      conveyors/
        baseConveyor.ts       ← Conveyor base class
        conveyorClass.ts      ← Movement logic for conveyor belts
      products/
        woodCube.ts           ← WoodCube product with lifetime cleanup
        Products.d.ts         ← Product type declarations
      sellZone.ts             ← Detects products, awards coins to player
      spawnUtils.ts           ← getPlayerSpawnPosition, spawnTemplateModel
    requests/
      placement.ts            ← PlaceRequest handler: validates grid, spawns model
    services/
      playerService.ts        ← Player join / leave lifecycle
    utils/
      logger.ts               ← logger.info / logger.warn / logger.error
  client/
    main.client.tsx           ← Entry: mounts React UI, connects remote listeners
    placementController.ts    ← Ghost preview + click-to-place client logic
    ui/
      components/
        GameUI.tsx            ← Root HUD: balance, multiplier display
        UpgradeShop.tsx       ← Shop panel: lists and purchases upgrades
  shared/
    types.ts                  ← PlayerData, Upgrade, UPGRADES map, grid types
    constants.ts              ← All tuning constants (see below)
    remotes.ts                ← getRemotes() typed factory
    gridMath.ts               ← Grid coordinate math utilities
```

---

## Game Systems

### Mining
`BaseMiner` spawns a `WoodCube` product every `MINING_CONFIG.BASE_INTERVAL_SECONDS` seconds. Each miner is placed on the player's grid plot and ejects products toward a configurable `DropSide`.

### Conveyor Belts
`ConveyorClass` moves products that land on it toward the next cell at `CONVEYOR_CONFIG.baseSpeed`. Conveyors chain together to route products from miners to sell zones.

### Sell Zones
`sellZone.ts` scans for products within its area. When a product touches a sell zone, it is removed and the owning player is awarded coins based on `data.multiplier`.

### Upgrades
Upgrades are defined in `shared/types.ts::UPGRADES` and typed via `shared/constants.ts::UPGRADE_CONFIG`. Two types exist:

| Type | Effect |
|---|---|
| `multiplier` | Increases coin multiplier (e.g. Basic Pickaxe, Gold Pickaxe) |
| `spawner` | Spawns a machine (Miner, Conveyor, Sell Zone) on the player's plot |

### Placement
The client fires a `PlaceRequest` (machine type, grid coord, surface Y, rotation) and the server validates the cell is free, snaps the CFrame, and spawns the model.

---

## Remotes

All remotes are typed and managed in `shared/remotes.ts`. Use `getRemotes()` everywhere.

| Remote | Direction | Payload |
|---|---|---|
| `PlayerJoined` | Server → Client | _(none)_ |
| `BuyUpgrade` | Client → Server | `upgradeId: string` |
| `UpdateBalance` | Server → Client | `newBalance: number` |
| `UpdateMultiplier` | Server → Client | `newMultiplier: number` |
| `PlaceRequest` | Client → Server | `{ machineType, coord, surfaceY, rotationQuarterTurns }` |
| `PlaceResponse` | Server → Client | `{ success, reason? }` |

---

## Constants (`shared/constants.ts`)

```ts
MINING_CONFIG.BASE_INTERVAL_SECONDS      // default mine interval
MINING_CONFIG.UPGRADED_INTERVAL_SECONDS  // faster mine interval (unused slot)
MINING_CONFIG.MAX_MINERS_PER_PLAYER      // cap per player

UPGRADE_CONFIG.basicPickaxe.{cost, multiplier}
UPGRADE_CONFIG.goldPickaxe.{cost, multiplier}

PLOT_CONFIG.SPACING     // studs between plots
PLOT_CONFIG.MAX_PLOTS   // max concurrent plots

PRODUCT_CONFIG.woodCube.lifetime   // seconds before auto-cleanup

CONVEYOR_CONFIG.baseSpeed        // studs/s conveyor movement
CONVEYOR_CONFIG.updateInterval   // heartbeat interval (s)

SELL_ZONE_CONFIG.glowRange       // detection radius (studs)
SELL_ZONE_CONFIG.glowBrightness  // glow part brightness
```

---

## Prerequisites

- Node.js 20+ (or Bun 1.3+)
- Roblox Studio

---

## Development

```bash
# Install dependencies
npm ci

# Build once
npm run build

# Watch mode (rebuilds on save)
npm run watch
```

Open `default.project.json` with [Rojo](https://rojo.space/) in Roblox Studio to sync the compiled output.

---

## Adding New Features

### New miner type
1. Create `src/server/models/miners/<Name>Miner.ts` extending `MinerClass`.
2. Add size to `MACHINE_SIZES` in `shared/types.ts`.
3. Add a `spawner` upgrade to `UPGRADES` in `shared/types.ts` if placeable.

### New upgrade
1. Add config in `UPGRADE_CONFIG` (`shared/constants.ts`).
2. Add entry in `UPGRADES` (`shared/types.ts`).
3. Handle new logic in `onBuyUpgrade` (`server/upgrade.ts`).

### New remote
1. Add typed interface in `shared/remotes.ts` (`Remotes` interface + `ensureRemote` call).
2. Wire server listener in `server/main.server.ts` or a relevant service.
3. Fire from client with the typed payload.

---

## GitHub Flow

1. Base off `master` (or `main` when switched).
2. Create a short branch: `feature/<description>` or `fix/<description>`.
3. Keep commits focused and descriptive (`feat:`, `fix:`, `chore:` prefixes).
4. Open a PR early, ensure `npm run build` passes.
5. Merge after CI is green.

---

## AI Collaboration Files

| File | Agent |
|---|---|
| `.github/copilot-instructions.md` | GitHub Copilot |
| `AGENTS.md` | OpenAI Codex / general agents |
| `CLAUDE.md` | Anthropic Claude |
| `GEMINI.md` | Google Gemini |
| `.cursorrules` | Cursor IDE |

Keep all AI guidance files aligned with actual project conventions.
