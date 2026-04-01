# Cloud Agent Refactoring Prompt

## Mission
Refactor the Dave Factory Tycoon codebase to follow proper Roblox-TS and TypeScript architecture standards.

## Prerequisites
- Read `ARCHITECTURE_ANALYSIS.md` for detailed issues identified
- Read `ROBLOX_TS_BEST_PRACTICES.md` for pattern reference
- Adhere to `CLAUDE.md` project guidelines

## Phase Overview

Complete these phases in order. Each phase can be a separate commit.

---

## Phase 1: Rename Files to Consistent camelCase

**Why:** Roblox-TS convention is camelCase for .ts files. Current mix creates confusion.

**Files to Rename:**
1. `src/server/Models/Miners/BaseMiner.ts` → `src/server/Models/Miners/baseMiner.ts`
2. `src/server/Models/Miners/MinerClass.ts` → `src/server/Models/Miners/minerClass.ts`
3. `src/server/Models/Conveyors/BaseConveyor.ts` → `src/server/Models/Conveyors/baseConveyor.ts`
4. `src/server/Models/Conveyors/ConveyorClass.ts` → `src/server/Models/Conveyors/conveyorClass.ts`
5. `src/server/Models/Products/WoodCube.ts` → `src/server/Models/Products/woodCube.ts`
6. `src/server/Models/SellZone.ts` → `src/server/Models/sellZone.ts`

**Steps:**
1. Rename each file using git mv (preserves history)
2. Update all imports in files that reference these modules
3. Verify build: \`npm run build\`
4. Commit: "refactor: rename model files to camelCase convention"

---

## Phase 2: Flatten Models Folder Structure

**Why:** Models folder adds no organizational value, just nesting.

**From:**
```
src/server/Models/
  ├── Miners/
  ├── Conveyors/
  ├── Products/
  └── SellZone.ts
```

**To:**
```
src/server/models/
  ├── miners/
  ├── conveyors/
  ├── products/
  └── sellZone.ts
```

**Steps:**
1. Create new `src/server/models/` directory
2. Move and rename folders:
   - `Models/Miners/` → `models/miners/`
   - `Models/Conveyors/` → `models/conveyors/`
   - `Models/Products/` → `models/products/`
3. Move `Models/SellZone.ts` → `models/sellZone.ts`
4. Move `Models/spawnUtils.ts` → `models/spawnUtils.ts`
5. Update all imports from `"server/Models/..."` to `"server/models/..."`
6. Delete old `Models/` folder
7. Verify build: \`npm run build\`
8. Commit: "refactor: flatten models folder structure"

---

## Phase 3: Create Shared Constants File

**Why:** Centralize magic numbers for easier game balance tuning.

**Create:** `src/shared/constants.ts`

**Content:**
```typescript
// Mining configuration
export const MINING_CONFIG = {
  BASE_INTERVAL_SECONDS: 5,
  UPGRADED_INTERVAL_SECONDS: 3,
  MAX_MINERS_PER_PLAYER: 10,
} as const;

// Upgrade costs and multipliers
export const UPGRADE_CONFIG = {
  basicPickaxe: {
    cost: 10,
    multiplier: 2,
  },
  goldPickaxe: {
    cost: 100,
    multiplier: 5,
  },
} as const;

// Plot configuration
export const PLOT_CONFIG = {
  SPACING: 50,
  MAX_PLOTS: 10,
} as const;
```

**Steps:**
1. Create the file with all magic numbers from the codebase
2. Update `src/shared/types.ts` UPGRADES object to use constants
3. Update `src/server/models/miners/baseMiner.ts` getInterval() to use constant
4. Replace all magic numbers in codebase with imported constants
5. Verify build: \`npm run build\`
6. Commit: "refactor: centralize game constants"

---

## Phase 4: Create Services Layer

**Why:** Separate business logic from Roblox initialization.

**Create new services in `src/server/services/`:**

### 4.1: playerService.ts
Extract player data management from `data.ts`

```typescript
import { PlayerData } from "shared/types";

export class PlayerService {
  private playerData = new Map<Player, PlayerData>();

  addPlayer(player: Player): void {
    this.playerData.set(player, {
      playerId: player.UserId,
      coins: 0,
      multiplier: 1,
      unlockedUpgrades: [],
      lastChecked: os.time(),
    });
  }

  removePlayer(player: Player): void {
    this.playerData.delete(player);
  }

  getPlayer(player: Player): PlayerData | undefined {
    return this.playerData.get(player);
  }

  addCoins(player: Player, amount: number): void {
    const data = this.getPlayer(player);
    if (data) {
      data.coins += amount;
    }
  }

  getBalance(player: Player): number {
    return this.getPlayer(player)?.coins ?? 0;
  }
}
```

### 4.2: Update data.ts
Remove player service logic, keep ONLY player lifecycle events:

```typescript
import { Players } from "@rbxts/services";
import { PlayerService } from "server/services/playerService";
import { assignPlot, releasePlot, spawnPlayerAtPlot } from "server/plot";

const playerService = new PlayerService();

function onPlayerAdded(player: Player) {
  playerService.addPlayer(player);
  
  const plot = assignPlot(player);
  if (!plot) {
    player.Kick("Server is full");
    return;
  }

  player.CharacterAdded.Connect((character) => spawnPlayerAtPlot(player, character));
  const existingCharacter = player.Character;
  if (existingCharacter) {
    spawnPlayerAtPlot(player, existingCharacter);
  }
}

function onPlayerRemoving(player: Player) {
  playerService.removePlayer(player);
  releasePlot(player);
}

Players.PlayerAdded.Connect(onPlayerAdded);
Players.PlayerRemoving.Connect(onPlayerRemoving);

export { playerService };
```

**Steps:**
1. Create `src/server/services/playerService.ts` with content above
2. Update `src/server/data.ts` to remove PlayerService logic
3. Export playerService from data.ts (or import in main.server.ts)
4. Update `src/server/main.server.ts` to use playerService
5. Verify build: \`npm run build\`
6. Commit: "refactor: extract PlayerService from data.ts"

---

## Phase 5: Create Logger Service

**Why:** Centralize logging, allow for easier control and redirection.

**Create:** `src/server/utils/logger.ts`

```typescript
export enum LogLevel {
  Info = "INFO",
  Warn = "WARN",
  Error = "ERROR",
}

export class Logger {
  info(message: string): void {
    print(`[INFO] ${message}`);
  }

  warn(message: string): void {
    print(`[WARN] ⚠️  ${message}`);
  }

  error(message: string): void {
    print(`[ERROR] ❌ ${message}`);
  }
}

export const logger = new Logger();
```

**Steps:**
1. Create `src/server/utils/logger.ts`
2. Replace all \`print()\` calls with \`logger.info()\`, \`logger.warn()\`, or \`logger.error()\`
3. Import logger in files that use it:
   - src/server/main.server.ts
   - src/server/data.ts
   - src/server/miner.ts
   - src/server/upgrade.ts
4. Verify build: \`npm run build\`
5. Commit: "refactor: create Logger service and replace print() calls"

---

## Phase 6: Update All Imports

**Why:** Use consistent import style based on tsconfig.json baseUrl.

**Rule:** Use absolute imports from src root, not relative paths

**Example Updates:**
```typescript
// Before (relative - bad)
import { BaseMiner } from "../../../server/Models/Miners/BaseMiner";
import { logger } from "../../../utils/logger";

// After (absolute - good)
import { BaseMiner } from "server/models/miners/baseMiner";
import { logger } from "server/utils/logger";
```

**Steps:**
1. Check tsconfig.json baseUrl is set to "src"
2. Update all imports in all files to use absolute paths
3. Search for all \`../../../\` patterns and fix them
4. Search for all \`./\` relative imports and convert to absolute
5. Verify build: \`npm run build\`
6. Commit: "refactor: use consistent absolute imports"

---

## Phase 7: Add Error Handling

**Why:** Prevent silent failures, make issues visible.

**Example Pattern:**
```typescript
// src/server/data.ts - wrap in try-catch
function onPlayerAdded(player: Player) {
  try {
    playerService.addPlayer(player);
    
    const plot = assignPlot(player);
    if (!plot) {
      logger.error(`No plots available for ${player.Name}`);
      player.Kick("Server is full");
      return;
    }
    
    logger.info(`${player.Name} joined with plot assigned`);
  } catch (err) {
    logger.error(`Player join error for ${player.Name}: ${tostring(err)}`);
  }
}
```

**Steps:**
1. Wrap all event handlers in try-catch blocks
2. Add validation for remote event arguments
3. Add error checks for critical operations (spawn, assign plot, etc)
4. Log all errors with context
5. Verify build: \`npm run build\`
6. Commit: "refactor: add error handling and validation"

---

## Verification Checklist

After all phases, verify:

- [ ] Build succeeds: \`npm run build\`
- [ ] No import errors in console
- [ ] File structure matches Phase 2 (models folder flattened)
- [ ] All magic numbers removed to constants.ts
- [ ] All print() calls replaced with logger
- [ ] All imports use absolute paths
- [ ] PlayerService extracted from data.ts
- [ ] Error handling added to critical paths
- [ ] Game runtime: Player can join, spawn miners, conveyors, upgrades
- [ ] No console errors during gameplay

---

## Manual Testing

**In Roblox Studio:**

1. **Player Join:**
   - [ ] Player joins successfully
   - [ ] Plot assigned
   - [ ] Character spawned at plot
   - [ ] Balance appears in UI

2. **Mining:**
   - [ ] Spawn miner works (use UI button)
   - [ ] Miner generates coins
   - [ ] Balance updates in real-time

3. **Upgrades:**
   - [ ] Buy upgrades dialog works
   - [ ] Upgrade purchase deducts coins
   - [ ] Multiplier increases visibly

4. **Conveyors:**
   - [ ] Spawn conveyor works
   - [ ] Items flow through conveyor
   - [ ] Items reach sell zone

5. **Sell Zone:**
   - [ ] Items auto-sell when touching zone
   - [ ] Balance increases correctly

---

## Git Commits Summary

Expected commits after all phases:

1. "refactor: rename model files to camelCase convention"
2. "refactor: flatten models folder structure"
3. "refactor: centralize game constants"
4. "refactor: extract PlayerService from data.ts"
5. "refactor: create Logger service and replace print() calls"
6. "refactor: use consistent absolute imports"
7. "refactor: add error handling and validation"

---

**Status:** Ready for execution
**Estimated Time:** 2-3 hours for complete refactoring
**Build Command:** \`npm run build\`
**Test in Studio:** Required after final phase
