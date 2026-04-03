---
name: "Server Code Review Guidelines"
description: "Use when: reviewing server-side code in src/server/. Ensures state mutations follow the authoritative game logic model, remotes are properly typed, and the server boundary is not violated."
applyTo: "src/server/**/*.ts"
---

# Server Code Review Guidelines for Dave Factory Tycoon

When reviewing server code (`src/server/`), you are reviewing the **authoritative game logic layer**. All player state mutations, economy calculations, model spawns, and remote handlers must originate here.

## Core Rules (Non-Negotiable)

✅ **DO**:

- Import only from `server/`, `shared/`—never from `client/`
- Mutate `PlayerData` only inside `server/` files (especially `data.ts`)
- Call `getRemotes()` from `shared/remotes.ts` — never create RemoteEvents by string
- Reference tuning values from `shared/constants.ts` by name (e.g., `MINING_CONFIG.BASE_INTERVAL_SECONDS`)
- Add explicit return types to exported functions
- Use `logger` from `server/utils/logger` — never `print()` or `warn()`

❌ **DON'T**:

- Import from `src/client/` in any server file
- Create RemoteEvent instances outside `shared/remotes.ts`
- Hardcode magic numbers (costs, intervals, grid spacing, etc.)
- Use `any` or `unknown` types where a typed alternative exists
- Mutate player state from remote handlers without proper validation
- Assume client input is valid — validate all remote payloads

## Key Files

Review these first to understand context:

- [shared/constants.ts](../../src/shared/constants.ts) — all tuning constants
- [shared/remotes.ts](../../src/shared/remotes.ts) — all RemoteEvents
- [shared/types.ts](../../src/shared/types.ts) — `PlayerData`, `Upgrade`, `PlaceRequest`
- [server/data.ts](../../src/server/data.ts) — the source of truth for player state
- [server/main.server.ts](../../src/server/main.server.ts) — wiring and entry point

## Common Patterns to Check

### Remote Handler Pattern

```ts
// ✅ Good: Validate, mutate server state, fire back to client
remotes.BuyUpgrade.OnServerEvent.Connect((player, upgradeId: string) => {
	const success = onBuyUpgrade(player, upgradeId); // Separate handler
	if (!success) {
		logger.warn(`Buy failed for ${player.Name}: ${upgradeId}`);
	}
});

// ❌ Bad: Inline logic, no validation, client-side assumptions
remotes.BuyUpgrade.OnServerEvent.Connect((player, upgradeId) => {
	const data = getPlayerData(player);
	data.balance -= 100; // Hardcoded!
	remotes.UpdateBalance.FireClient(player, data.balance);
});
```

### State Mutation Pattern

```ts
// ✅ Good: Encapsulated, typed, with guards
export function addCoins(player: Player, amount: number): void {
	assert(amount > 0, "Coins must be positive");
	const data = getPlayerData(player);
	data.balance += amount;
	getRemotes().UpdateBalance.FireClient(player, data.balance);
	logger.info(`Added ${amount} coins to ${player.Name} → ${data.balance}`);
}

// ❌ Bad: Direct mutation, no logging, no validation
getPlayerData(player).balance += amount;
```

### Tuning Values Pattern

```ts
// ✅ Good: Reference constants
import { MINING_CONFIG } from "shared/constants";
const interval = MINING_CONFIG.BASE_INTERVAL_SECONDS;

// ❌ Bad: Magic numbers
const interval = 2.5; // What does this mean? Is it configurable?
```

### Model Spawning Pattern

```ts
// ✅ Good: Use shared types and grid validation
import { PlaceRequest } from "shared/types";
function handlePlacement(request: PlaceRequest): boolean {
  if (!isGridValid(request.coord, player)) {
    logger.warn("Invalid grid position");
    return false;
  }
  const model = spawnModel(request.machineType, request.coord);
  return true;
}

// ❌ Bad: Assume input is valid, no checks
function spawnMachine(machineType: string, x: number, y: number) {
  const model = game.ServerStorage.Templates[machineType.]:Clone(); // Typo risk
  // ...
}
```

## Review Checklist

Before approving, confirm:

- [ ] No imports from `src/client/` — check `import { ... } from "client/..."`
- [ ] All RemoteEvent access via `getRemotes()` — no `.WaitForChild()` on custom names
- [ ] State mutations only inside `server/` — especially `PlayerData`
- [ ] All tuning values reference `shared/constants` — grep for magic numbers like `2.5`, `100`, `50`
- [ ] Player input validated before use (`PlaceRequest` coord checked, upgrade ID exists, coins available)
- [ ] Explicit return types on exports — `export function foo(): BarType { ... }`
- [ ] Logger used, not `print()` — grep for direct `print` calls
- [ ] Type safety: no `any` in production code (OK in tests/mocks)
- [ ] Remote handlers are thin — actual logic in dedicated functions (see `upgrade.ts` pattern)

## Red Flags (Request Changes)

🚩 **Architecture**

- Any `import` from `client/`
- RemoteEvent created outside `shared/remotes.ts`
- State mutation from client-attached code

🚩 **Type Safety**

- `any` or `unknown` without justification
- Untyped remote payloads (should be `PlaceRequest`, `upgradeId: string`, etc.)
- Missing return types on exports

🚩 **Economy/Logic**

- Hardcoded costs, intervals, or multipliers instead of constants
- Player input not validated before state mutation
- Balance can go negative, slots over-filled, etc.

🚩 **Code Quality**

- `print()`/`warn()` instead of `logger`
- Very long handlers (>50 lines) without helper extraction
- Repeated patterns that should be shared utilities

## Praise Patterns (Approve)

✨ **Small, focused handlers**
✨ **Defensive input validation**
✨ **Clear separation of concerns** (remote handler wires, separate handler does work)
✨ **Comprehensive logging** for debugging economy issues
✨ **Constants referenced by name**
✨ **Test-friendly structure** (pure functions, no singletons)

---

**Questions?** Reference [CLAUDE.md](../../CLAUDE.md) and [AGENTS.md](../../AGENTS.md) for full architecture details.
