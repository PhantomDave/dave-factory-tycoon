# Roblox-TS & TypeScript Best Practices Reference

**Purpose:** Reference guide for proper patterns and standards for this Roblox-TS project

---

## File Organization & Naming

### File Naming Convention
\`\`\`
✓ Good (camelCase for .ts files):
  - src/server/services/playerService.ts
  - src/server/models/miners/baseMiner.ts
  - src/client/utils/validation.ts
  - src/shared/constants.ts

✓ Good (PascalCase for .tsx React components):
  - src/client/ui/GameUI.tsx
  - src/client/ui/components/UpgradeShop.tsx

✗ Bad (mixing conventions):
  - src/server/Models/Miners/BaseMiner.ts (should be baseMiner.ts)
  - src/server/Data.ts (should be data.ts)
\`\`\`

### Folder Structure
\`\`\`
✓ Good (flat, clear layers):
src/
├── server/
│   ├── services/      (business logic)
│   ├── models/        (data models, entity classes)
│   ├── utils/         (helpers)
│   └── types/         (server-only types)
├── client/
│   ├── services/      (client-side services)
│   ├── ui/            (React components)
│   └── utils/
└── shared/
    ├── types.ts       (shared types)
    ├── constants.ts   (shared constants)
    └── utils/

✗ Bad (over-nested, unclear):
src/server/Models/Miners/Templates/Special/Custom/miner.ts
\`\`\`

---

## TypeScript & Code Standards

### Constants & Magic Numbers

\`\`\`typescript
// ✓ Good: Centralized constants
export const MINING_CONFIG = {
  BASE_INTERVAL_SECONDS: 5,
  UPGRADED_INTERVAL_SECONDS: 3,
  MAX_MINERS_PER_PLAYER: 10,
} as const;

// ✗ Bad: Magic numbers scattered
export class BaseMiner {
  getInterval(): number {
    return 5;  // What does 5 mean?
  }
}
\`\`\`

### Services Pattern (Separation of Concerns)

\`\`\`typescript
// ✓ Good: Service-oriented architecture
export class PlayerService {
  private playerData = new Map<Player, PlayerData>();

  addPlayer(player: Player): void {
    // Implementation
  }
}

// ✗ Bad: Mixed concerns
function onPlayerAdded(player: Player) {
  // Player data setup + Plot assignment + Spawning logic
  // All in one place!
}
\`\`\`

### Error Handling

\`\`\`typescript
// ✓ Good: Explicit error handling
export function getPlayer(player: Player): PlayerData | undefined {
  try {
    const data = playerDataMap.get(player);
    if (!data) {
      logger.warn(\`Player data not found for \${player.Name}\`);
      return undefined;
    }
    return data;
  } catch (err) {
    logger.error(\`Error: \${tostring(err)}\`);
    return undefined;
  }
}

// ✗ Bad: Silent failures
export function processUpgrade(player: Player, upgradeId: string) {
  const upgrade = UPGRADES[upgradeId];
  const cost = upgrade.cost; // Can crash if upgrade doesn't exist
}
\`\`\`

---

## Roblox-TS Specific Patterns

### Services Initialization

\`\`\`typescript
// ✓ Good: Services with initialize method
export class MinerService {
  initialize(): void {
    Players.PlayerAdded.Connect((player) => {
      // Setup
    });
  }
}

// Usage in main.server.ts
const minerService = new MinerService();
minerService.initialize();
\`\`\`

### Logging Service

\`\`\`typescript
// ✓ Good: Centralized logging
export class Logger {
  info(message: string): void {
    print(\`[INFO] \${message}\`);
  }
  
  error(message: string): void {
    print(\`[ERROR] \${message}\`);
  }
}

// ✗ Bad: Scattered print statements
print("Player joined");
print("Error: no plot");
\`\`\`

---

## Summary Table

| Pattern | ✓ Good | ✗ Bad |
|---------|--------|-------|
| **File Names** | \`baseMiner.ts\` | \`BaseMiner.ts\` |
| **Constants** | \`MINING_CONFIG.BASE_INTERVAL\` | \`5\` (magic #) |
| **Services** | \`new PlayerService()\` | Global functions |
| **Error Handling** | try-catch + logging | Silent failures |
| **Logging** | \`logger.info()\` | \`print()\` everywhere |

---

**Last Updated:** 2026-04-01
**Framework:** Roblox-TS 3.0.0 with TypeScript 5.9
