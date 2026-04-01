# Architecture Analysis & Refactoring Guide

**Date:** 2026-04-01
**Status:** Analysis for cloud agent automated refactoring
**Framework:** Roblox-TS (TypeScript for Roblox)

---

## Overview

This document identifies architectural issues in the Dave Factory Tycoon codebase and provides a detailed refactoring plan based on:
- **Roblox TS best practices** (official rbxts documentation)
- **TypeScript best practices** (2024 standards)
- **Game architecture patterns** (separation of concerns, modularity)

---

## Current Structure

```
src/
├── client/
│   ├── main.client.tsx (Game UI wrapper + state)
│   └── ui/
│       └── components/
│           ├── GameUI.tsx
│           └── UpgradeShop.tsx
├── server/
│   ├── main.server.ts (Initialization & remotes)
│   ├── data.ts (Player data + plot logic - MIXED CONCERNS)
│   ├── miner.ts (Mining loop)
│   ├── upgrade.ts
│   ├── plot.ts
│   └── Models/
│       ├── Miners/
│       │   ├── BaseMiner.ts
│       │   ├── MinerClass.ts
│       │   └── (parent classes)
│       ├── Conveyors/
│       │   ├── BaseConveyor.ts
│       │   └── (parent classes)
│       ├── Products/
│       │   ├── Products.d.ts
│       │   └── WoodCube.ts
│       ├── SellZone.ts
│       └── spawnUtils.ts
└── shared/
    ├── types.ts
    └── remotes.ts
```

---

## Issues Identified

### 1. **File Naming Inconsistency** ❌
- **Problem:** Mix of PascalCase (BaseMiner.ts) and camelCase (data.ts, miner.ts)
- **Impact:** Confusing, unpredictable imports, violates rbxts conventions
- **Roblox-TS Standard:** Files should follow `camelCase.ts` (e.g., `baseMiner.ts`)
- **Exception:** React components (`.tsx`) → PascalCase is correct

**Current:**
```
src/server/miner.ts ✓
src/server/Models/Miners/BaseMiner.ts ❌ (should be baseMiner.ts)
src/server/Models/Miners/MinerClass.ts ❌ (should be minerClass.ts)
src/server/Models/Conveyors/BaseConveyor.ts ❌ (should be baseConveyor.ts)
```

### 2. **Mixed Concerns in `data.ts`** ❌
- **Problem:** Handles 3 unrelated concerns:
  - Player data storage
  - Player join/leave lifecycle
  - Plot assignment logic
- **Impact:** Hard to test, maintain, and extend
- **Solution:** Split into `playerData.ts`, `playerService.ts`, `plotService.ts`

### 3. **Models Folder Too Nested** ❌
- **Current:** `/server/Models/Miners/BaseMiner.ts`
- **Problem:** `Models` folder adds no value, just nesting
- **Roblox-TS Standard:** Flatter structure preferred
- **Solution:** Move to `/server/models/{miners,conveyors,products,sellZone}`

### 4. **No Services Layer** ❌
- **Problem:** Direct access to Roblox services scattered everywhere
- **Impact:** Hard to mock for testing, tightly coupled
- **Solution:** Create service layer:
  ```
  src/server/services/
  ├── playerService.ts
  ├── minerService.ts
  ├── conveyorService.ts
  └── plotService.ts
  ```

### 5. **Missing Constants File** ❌
- **Problem:** Magic numbers scattered (e.g., `getInterval(): 5`, costs in types.ts)
- **Impact:** Impossible to tune game balance without searching code
- **Solution:** Create `src/shared/constants.ts`

### 6. **No Error Handling** ❌
- **Problem:** No try-catch, no validation, no error propagation
- **Examples:**
  - `player.WaitForChild()` can timeout → no handling
  - `assignPlot()` can fail → no detailed error propagation
  - Remote events can fire with invalid data
- **Solution:** Add validation layer, error types

### 7. **Remotes Directly Accessed** ❌
- **Problem:** Components directly call `remotes.BuyUpgrade.FireServer()`
- **Impact:** Hard to test UI, tightly coupled to networking
- **Solution:** Create `RemoteClient` service with domain methods

### 8. **Inconsistent Import Paths** ❌
- **Problem:** Mix of imports using `"shared/remotes"` and relative paths
- **Impact:** Hard to refactor, unclear module boundaries
- **Solution:** Use consistent import aliases from tsconfig.json

### 9. **No Logging Infrastructure** ❌
- **Problem:** `print()` statements used directly
- **Impact:** Can't control logging levels, hard to redirect output
- **Solution:** Create logger service with levels: INFO, WARN, ERROR

### 10. **React Component State Management** ❌
- **Problem:** `main.client.tsx` has all game state (balance, multiplier, shop)
- **Impact:** Hard to add complex features, testing nightmare
- **Solution:** Extract to context provider or state service

### 11. **Missing Type Safety for Remotes** ⚠️
- **Partial:** `remotes.ts` has good TypeScript types
- **Problem:** No validation that client/server use same remote signatures
- **Solution:** Enforce naming conventions, add validation

### 12. **Inheritance-Heavy Model Classes** ❌
- **Problem:** BaseMiner → MinerClass inheritance chain
- **TypeScript Best Practice:** Composition over inheritance
- **Solution:** Refactor to composition-based patterns

---

## Design Patterns to Implement

### Recommended Structure Post-Refactoring

```
src/
├── client/
│   ├── main.client.ts
│   ├── ui/
│   │   ├── GameUI.tsx
│   │   └── UpgradeShop.tsx
│   └── services/
│       ├── remoteClient.ts
│       └── gameStateManager.ts
├── server/
│   ├── main.server.ts
│   ├── services/
│   │   ├── playerService.ts
│   │   ├── minerService.ts
│   │   ├── conveyorService.ts
│   │   ├── plotService.ts
│   │   └── upgradeService.ts
│   ├── models/
│   │   ├── miners/
│   │   │   ├── baseMiner.ts
│   │   │   └── minerTemplates.ts
│   │   ├── conveyors/
│   │   │   └── baseConveyor.ts
│   │   ├── products/
│   │   │   └── woodCube.ts
│   │   ├── sellZone.ts
│   │   └── spawnUtils.ts
│   ├── utils/
│   │   ├── logger.ts
│   │   └── validation.ts
│   └── types/
│       └── domain.ts (server-only types)
└── shared/
    ├── constants.ts
    ├── types.ts
    ├── remotes.ts
    └── utils/
        └── validation.ts
```

---

## Refactoring Priorities (Ranked by Impact)

### Priority 1: Critical Structure (Foundation)
1. **Rename files to consistent camelCase** (except .tsx components)
2. **Create constants file** - Move magic numbers from code
3. **Split data.ts** into playerData, playerService, plotService
4. **Create services layer** for game logic

### Priority 2: Patterns (Quality)
5. **Add logging service** - Replace scattered `print()` calls
6. **Implement error handling** - Add try-catch and validation
7. **Flatten Models folder** - Remove unnecessary nesting
8. **Extract remote service** - Reduce direct remote access in components

### Priority 3: Advanced (Maintainability)
9. **Refactor inheritance** - Move to composition-based models
10. **Add state management** - Centralize client state
11. **Type domain models** - Create strong domain types in `shared/domain.ts`
12. **Add validation layer** - Centralized input validation

---

## Code Examples - Before & After

### Example 1: Constants
**Before:**
```typescript
// src/server/Models/Miners/BaseMiner.ts
export class BaseMiner extends MinerClass {
    getInterval(): number {
        return 5;  // Magic number!
    }
}

// src/shared/types.ts
basic_pickaxe: {
    cost: 10,  // Magic number!
    multiplier: 2,  // Magic number!
}
```

**After:**
```typescript
// src/shared/constants.ts
export const MINING_INTERVALS = {
    base: 5,
    upgraded: 3,
} as const;

export const UPGRADE_COSTS = {
    basicPickaxe: 10,
    goldPickaxe: 100,
} as const;

export const UPGRADE_MULTIPLIERS = {
    basicPickaxe: 2,
    goldPickaxe: 5,
} as const;
```

### Example 2: File Organization
**Before:**
```
src/server/Models/Miners/BaseMiner.ts
src/server/Models/Miners/MinerClass.ts
src/server/Models/Conveyors/BaseConveyor.ts
```

**After:**
```
src/server/models/miners/baseMiner.ts
src/server/models/miners/minerClass.ts
src/server/models/conveyors/baseConveyor.ts
```

### Example 3: Services
**Before:**
```typescript
// src/server/main.server.ts - Direct coupling
remotes.BuyUpgrade.OnServerEvent.Connect((player: Player, upgradeId: string) => {
    onBuyUpgrade(player, upgradeId);
});
```

**After:**
```typescript
// src/server/services/upgradeService.ts
export function setupUpgradeListeners() {
    const remotes = getRemotes();
    remotes.BuyUpgrade.OnServerEvent.Connect((player: Player, upgradeId: string) => {
        handleUpgradePurchase(player, upgradeId);
    });
}

// src/server/main.server.ts - Clean initialization
const upgrades = new UpgradeService();
upgrades.initialize();
```

---

## Implementation Checklist for Cloud Agent

- [ ] **Phase 1: File Renaming & Structure**
  - [ ] Rename all files to consistent camelCase
  - [ ] Flatten Models folder to models/
  - [ ] Create services/ folder
  - [ ] Create utils/ and types/ folders

- [ ] **Phase 2: Extract Services**
  - [ ] Create playerService.ts (from data.ts)
  - [ ] Create minerService.ts
  - [ ] Create conveyorService.ts
  - [ ] Create plotService.ts
  - [ ] Create upgradeService.ts

- [ ] **Phase 3: Constants & Configuration**
  - [ ] Create src/shared/constants.ts
  - [ ] Move all magic numbers to constants
  - [ ] Move all UPGRADES to constants

- [ ] **Phase 4: Utilities**
  - [ ] Create logger.ts service
  - [ ] Create validation.ts utility
  - [ ] Replace print() with logger

- [ ] **Phase 5: Error Handling**
  - [ ] Add try-catch blocks
  - [ ] Create error types
  - [ ] Add validation for remotes

- [ ] **Phase 6: Update Imports**
  - [ ] Update all imports to reflect new paths
  - [ ] Use consistent import style

---

## Key Roblox-TS & TypeScript Standards Applied

| Principle | Current | Target |
|-----------|---------|--------|
| **File Naming** | Mixed (BaseMiner, data) | Consistent camelCase |
| **Folder Structure** | Nested (Models) | Flat (models) |
| **Imports** | Mixed absolute/relative | Consistent absolute from tsconfig |
| **Error Handling** | None | Try-catch + validation |
| **Logging** | Scattered print() | Centralized logger |
| **Type Safety** | Partial | Full with domain types |
| **Separation of Concerns** | Mixed (data.ts) | Services + models |
| **Code Organization** | Ad-hoc | Clear layers (services, models, utils) |
| **Constants** | Scattered | Centralized |
| **Composition** | Inheritance-heavy | Composition-based |

---

## Cloud Agent Instructions

**Goal:** Refactor the codebase to implement the architecture described above.

**Approach:**
1. Execute phases in order (1-6)
2. Maintain backward compatibility during refactoring
3. All tests should pass after each phase
4. Keep diffs narrow per phase
5. Update all imports carefully
6. Verify build succeeds (`npm run build`)

**Commands to run after completion:**
```bash
npm run build
npm run watch  # for development
```

**Testing:**
- Manual in-game testing of: player join, upgrade purchase, miner spawn, conveyor spawn
- Verify no console errors

---

## References

- [Roblox-TS Documentation](https://roblox-ts.com/)
- [TypeScript Best Practices 2024](https://www.typescriptlang.org/docs/)
- [Roblox TS Plugin Examples](https://github.com/roblox-ts/rbxts-examples)
- [Game Architecture Patterns](https://refactoring.guru/design-patterns)

---

**Status:** Ready for implementation by cloud agent
**Estimated Effort:** 6-8 phases (can be done iteratively)
