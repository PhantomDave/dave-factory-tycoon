# Dave Factory Tycoon Architecture Overview

Detailed system architecture and design patterns used in Dave Factory Tycoon.

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                          ROBLOX GAME                            │
└─────────────────────────────────────────────────────────────────┘
       │
       ├──────────────────────┬──────────────────────┐
       │                      │                      │
       ▼                      ▼                      ▼
   ┌────────┐            ┌────────┐            ┌────────┐
   │ SERVER │            │ CLIENT │            │WORKSPACE│
   └────────┘            └────────┘            │ (Shared) │
       │                      │                └────────┘
       │                      │
   ┌─────────────────────────────────────────────────┐
   │                                                 │
   │  main.server.ts              main.client.tsx   │
   │  ├─ Initialize Remotes       ├─ Mount UI       │
   │  ├─ Start Mining Loop        ├─ Listen Events  │
   │  ├─ Setup Event Handlers     ├─ Handle Input   │
   │  └─ Init Sell Zones          └─ Update Display │
   │                                                 │
   └─────────────────────────────────────────────────┘
```

## Detailed System Components

### 1. Player Data Management System

**Files**: `server/data.ts`

**Responsibility**: Maintain authoritative player state

**Data Structure**:
```typescript
Map<Player, PlayerData>
  {
    playerId: number,
    coins: number,
    multiplier: number,
    unlockedUpgrades: string[],
    lastChecked: number
  }
```

**Lifecycle**:
```
Player Joins
    ↓
onPlayerAdded() in data.ts
    ├─ Create PlayerData entry
    ├─ Assign plot via plot.ts
    ├─ Spawn player at plot
    └─ Add to playerData Map
    ↓
[Session Active]
    ├─ Coins updated by mining loop (miner.ts)
    ├─ Multiplier updated by upgrades (upgrade.ts)
    └─ Coins added by sell zones (Models/SellZone.ts)
    ↓
Player Leaves
    ↓
onPlayerRemoving() in data.ts
    ├─ Save data (would persist here)
    ├─ Release plot
    └─ Remove from playerData Map
```

**Key Functions**:
- `getPlayerData(player)`: Retrieve player's data
- `addCoins(player, amount)`: Add coins with multiplier consideration
- `getBalance(player)`: Get current coin count

### 2. Mining Loop System

**Files**: `server/miner.ts`

**Responsibility**: Passive income generation

**Flow**:
```
startMiningLoop() runs in infinite task
    ↓
Every 1 second:
    ├─ For each connected player:
    │  ├─ addCoins(player, 1)
    │  ├─ Get updated balance
    │  └─ remotes.UpdateBalance.FireClient(player, newBalance)
    └─ Repeat
```

**Why Infinite Task**:
- Needs to run continuously while server is running
- Spawned as separate task so it doesn't block initialization
- Uses `task.wait()` to yield every 1 second

**Integration**:
- Started from main.server.ts
- Updates player data in data.ts
- Broadcasts updates via remotes
- No manual cleanup needed (runs until server shutdown)

### 3. Upgrade System

**Files**: `server/upgrade.ts`, `shared/types.ts`

**Upgrade Types**:

1. **Multiplier Upgrades**
   - Increase coins per passive income tick
   - Example: "Gold Pickaxe" (cost: 100 coins, multiplier: 5)
   - Flow: Deduct coins → Update multiplier → Broadcast

2. **Spawner Upgrades**
   - Spawn game entities (miners, conveyors, etc.)
   - Example: "Spawn Miner" (cost: 0, spawns BaseMiner)
   - Flow: Deduct coins → Instantiate class → Spawn model

**Processing Flow**:
```
Client clicks "Buy Upgrade"
    ↓
remotes.BuyUpgrade.FireServer(upgradeId)
    ↓
onBuyUpgrade(player, upgradeId) in upgrade.ts
    ├─ Validate:
    │  ├─ Player exists?
    │  ├─ Upgrade exists?
    │  ├─ Already owned?
    │  └─ Has enough coins?
    │
    ├─ If valid:
    │  ├─ Handle upgrade type:
    │  │  ├─ Multiplier: Update data.multiplier
    │  │  └─ Spawner: Instantiate class, spawn(position)
    │  ├─ Deduct coins
    │  ├─ Add to unlockedUpgrades
    │  └─ Broadcast updates
    │
    └─ Return success/failure
    ↓
remotes.UpdateBalance.FireClient(player, newCoins)
remotes.UpdateMultiplier.FireClient(player, newMultiplier)
    ↓
Client updates UI
```

**Anti-Cheat**: All validation happens server-side; client request is untrusted.

### 4. Plot System

**Files**: `server/plot.ts`

**Responsibility**: Assign each player a private game area (plot) and track ownership

**Architecture**:

```
PLOT_POSITIONS: Vector3[]
    ├─ Position 1: (-408, 270, -582)
    ├─ Position 2: (-215, 270, -539)
    ├─ Position 3: (-198, 270, -396)
    ├─ Position 4: (-618, 270, -397)
    └─ Position 5: (-570, 270, -565)

Tracking Maps:
    ├─ plotOwners: Map<plotIndex, Player>
    │  └─ Which slots are taken
    │
    └─ playerPlots: Map<Player, PlotEntry>
       ├─ Folder reference
       └─ Plot index
```

**Key Functions**:
- `assignPlot(player)`: Find free slot, create folder, track ownership
- `releasePlot(player)`: Destroy folder, free slot
- `getPlayerPlot(player)`: Get player's plot folder
- `getPlotPosition(player)`: Get world-space origin
- `spawnPlayerAtPlot(player, character)`: Teleport character to plot

**Folder Structure in Workspace**:
```
Workspace
    ├─ Plot_0 (owned by Player1)
    │  ├─ [Miners/Conveyors/Products spawned by Player1]
    │  └─ PlotPosition = (-408, 270, -582)
    │
    ├─ Plot_1 (owned by Player2)
    │  ├─ [Player2's entities]
    │  └─ PlotPosition = (-215, 270, -539)
    │
    └─ ... (up to 5 plots max)
```

**Isolation Benefits**:
- Players don't interfere with each other
- Easy to clean up on player leave (destroy Plot_X folder)
- Products and miners stay in correct ownership scope

### 5. Game Entity Classes

#### Miner System

**Hierarchy**:
```
MinerClass (abstract)
    └─ BaseMiner (concrete)
```

**MinerClass** (`Models/Miners/MinerClass.ts`):

```typescript
abstract class MinerClass {
  // State
  value: number;
  model: Model;
  templateName: string;
  product: Product;    // Composition: contains a Product
  ownerUserId?: number;

  // Abstract (subclass decides)
  abstract getInterval(): number;

  // Template method: shared mining loop
  startMining(): void {
    while (this.model.Parent) {
      task.wait(this.getInterval());
      this.spawnProduct(this.getSpawnPosition());
    }
  }

  // Lifecycle
  spawn(position): Model { /* spawn model, start mining */ }
}
```

**BaseMiner** (`Models/Miners/BaseMiner.ts`):
- Concrete implementation
- Spawns WoodCube products every 5 seconds
- Started by:
  1. Player buys "Spawn Miner" upgrade
  2. upgrade.ts instantiates: `new BaseMiner(templateName, player.UserId)`
  3. upgrade.ts calls: `miner.spawn(spawnPosition)`
  4. Miner creates model in Workspace
  5. Miner starts background loop
  6. Products spawn continuously until player destroys miner

**Product System**:

```typescript
interface Product {
  type: string;
  value: number;
  create(position: Vector3): Model;
}

class WoodCube implements Product {
  type = "WoodCube";
  value = 1;

  create(position: Vector3): Model {
    // Create wood part with attributes
    // Set ProductValue, ProductOwnerUserId
    // Auto-destroy after 30 seconds
  }
}
```

**Attributes Set on Products**:
- `ProductValue`: How much coins to award
- `ProductOwnerUserId`: Which player owns this
- `ProductIsSelling`: Prevents double-sells

#### Conveyor System

**Hierarchy**:
```
ConveyorClass (abstract)
    └─ BaseConveyor (concrete)
```

**Flow**:
```
Player clicks "Spawn Conveyor"
    ↓
remotes.SpawnConveyor.FireServer()
    ↓
In main.server.ts:
    ├─ Get spawn position via getPlayerSpawnPosition(player)
    ├─ Create: new BaseConveyor()
    └─ Spawn: conveyor.spawn(spawnPos)
    ↓
conveyor.spawn():
    ├─ Clone template from ReplicatedStorage
    ├─ Position in Workspace
    ├─ Call startTransporting()
    └─ Return model
    ↓
startTransporting():
    ├─ Find conveyor surface (BasePart)
    ├─ Connect to Touched event
    ├─ For items touching:
    │  ├─ Track in transportedItems Map
    │  ├─ Apply velocity along conveyor direction
    │  └─ Continue until off conveyor
    │
    └─ Cleanup when conveyor destroyed
```

**Transported Items Tracking**:
```typescript
transportedItems: Map<Instance, boolean>
  ├─ Prevents duplicate transport logic
  ├─ Cleans up on exit
  └─ Per-conveyor instance
```

#### Sell Zone System

**Responsibility**: Convert products to coins

**Architecture**:

```typescript
export class SellZone {
  constructor(private readonly zonePart: BasePart) {}

  bind(): RBXScriptConnection {
    return this.zonePart.Touched.Connect(hitPart => this.trySellProduct(hitPart));
  }

  private trySellProduct(hitPart: BasePart): void {
    // 1. Find product model
    // 2. Check not already selling
    // 3. Extract ProductValue and ProductOwnerUserId from attributes
    // 4. Give coins to owner
    // 5. Destroy product
  }
}

export function initializeSellZones(): void {
  const activeZones = new Set<BasePart>();

  // Find existing sell zones
  for (const descendant of Workspace.GetDescendants()) {
    bindZone(descendant);
  }

  // Listen for new sell zones added
  Workspace.DescendantAdded.Connect(instance => bindZone(instance));
}
```

**Key Pattern**: Registry of active zones prevents duplicate bindings

**Attribute Querying**:
- Checks Model for attribute first
- Falls back to touched Part if not on Model
- Handles missing attributes gracefully

### 6. Networking System

**Files**: `shared/remotes.ts`

**Type-Safe Remote Definition**:

```typescript
type TypedRemoteEvent<TArgs extends defined[] = []> = RemoteEvent & {
  FireServer: (...args: TArgs) => void;
  FireClient: (player: Player, ...args: TArgs) => void;
  FireAllClients: (...args: TArgs) => void;
  OnServerEvent: RBXScriptSignal<(player: Player, ...args: TArgs) => void>;
  OnClientEvent: RBXScriptSignal<(...args: TArgs) => void>;
};

export interface Remotes {
  PlayerJoined: TypedRemoteEvent;
  BuyUpgrade: TypedRemoteEvent<[upgradeId: string]>;
  UpdateBalance: TypedRemoteEvent<[newBalance: number]>;
  UpdateMultiplier: TypedRemoteEvent<[newMultiplier: number]>;
  SpawnConveyor: TypedRemoteEvent;
}
```

**Remote Initialization**:
```typescript
export function getRemotes(): Remotes {
  // Check if Remotes folder exists
  let remotes = ReplicatedStorage.FindFirstChild("Remotes");
  if (!remotes) {
    remotes = new Instance("Folder");
    remotes.Name = "Remotes";
    remotes.Parent = ReplicatedStorage;
  }

  // Ensure each remote exists
  const folder = remotes as Folder;
  return {
    PlayerJoined: ensureRemote("PlayerJoined"),
    BuyUpgrade: ensureRemote("BuyUpgrade"),
    // ... etc
  };
}
```

**Communication Patterns**:

1. **Client Request → Server**
   ```typescript
   // Client
   remotes.BuyUpgrade.FireServer("gold_pickaxe");

   // Server
   remotes.BuyUpgrade.OnServerEvent.Connect((player, upgradeId) => {
     onBuyUpgrade(player, upgradeId);
   });
   ```

2. **Server Broadcast → Client**
   ```typescript
   // Server
   remotes.UpdateBalance.FireClient(player, newBalance);

   // Client
   remotes.UpdateBalance.OnClientEvent.Connect((newBalance) => {
     setBalance(newBalance);
   });
   ```

### 7. UI System

**Files**: `client/ui/components/`

**Component Hierarchy**:
```
main.client.tsx
    └─ GameUIWrapper (Stateful, networking)
        └─ GameUI (Pure, presentational)
            ├─ Balance display
            ├─ Multiplier display
            ├─ Shop toggle button
            ├─ Spawn conveyor button
            └─ UpgradeShop (conditionally rendered)
                └─ Upgrade buttons (map over UPGRADES)
```

**State Management**:
```typescript
function GameUIWrapper() {
  const [balance, setBalance] = useState(0);
  const [multiplier, setMultiplier] = useState(1);
  const [shopOpen, setShopOpen] = useState(false);

  // Listen for server updates
  remotes.UpdateBalance.OnClientEvent.Connect((newBalance) => {
    setBalance(newBalance);
  });

  remotes.UpdateMultiplier.OnClientEvent.Connect((newMultiplier) => {
    setMultiplier(newMultiplier);
  });

  // Handlers dispatch to server
  const handleBuyUpgrade = (upgradeId: string) => {
    remotes.BuyUpgrade.FireServer(upgradeId);
  };

  return <GameUI balance={balance} onBuyUpgrade={handleBuyUpgrade} />;
}
```

**UI Rendering to PlayerGui**:
```typescript
const root = createRoot(new Instance("ScreenGui"));
root.render(
  <StrictMode>
    {createPortal(<GameUIWrapper />, playerGui)}
  </StrictMode>
);
```

---

## Data Flow Examples

### Example 1: Buying an Upgrade

```
┌─────────────┐
│   CLIENT    │
└─────────────┘
       │
   (1) │ User clicks "Buy Gold Pickaxe" button
       │
   (2) │ handleBuyUpgrade("gold_pickaxe")
       │
   (3) │ remotes.BuyUpgrade.FireServer("gold_pickaxe")
       │
       ├─────────────────────────────────────────────→ ┌─────────────┐
       │                                                │   SERVER    │
       │                                                └─────────────┘
       │
       │                                                    │
       │                                             (4) onBuyUpgrade()
       │                                                    │
       │                                             (5) Validate:
       │                                                    ├─ Player exists?
       │                                                    ├─ Upgrade exists?
       │                                                    ├─ Not already owned?
       │                                                    └─ Has 100 coins?
       │                                                    │
       │                                             (6) If valid:
       │                                                    ├─ data.coins -= 100
       │                                                    ├─ data.multiplier += 5
       │                                                    ├─ data.unlockedUpgrades.push()
       │                                                    │
       │  (7)  remotes.UpdateBalance.FireClient()         │
       ←─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┤
       │                                                    │
       │  (8)  remotes.UpdateMultiplier.FireClient()      │
       ←─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┤
       │                                                    │
   (9) │ Receive UpdateBalance event
       │ setBalance(900)
       │
  (10) │ Receive UpdateMultiplier event
       │ setMultiplier(11) [1 base + 5 from gold + 5 from other]
       │
  (11) │ UI re-renders with new values
       │
   UI  │ Shows "💰 Coins: 900" and "💰 Multiplier: 11"
       │
```

### Example 2: Passive Income Loop

```
Server startup:
    │
(1) startMiningLoop() spawned as task
    │
(2) Enter infinite while loop
    │
    ├──► Every 1 second:
    │
    │    For each player:
    │    ├─ addCoins(player, 1)
    │    │  └─ getPlayerData(player).coins += 1
    │    │
    │    ├─ Get updated balance
    │    │
    │    └─ remotes.UpdateBalance.FireClient(player, newBalance)
    │
    └──► Loop continues
         ↓
        Every second, each player gets 1 coin
        plus any multiplier from upgrades
```

### Example 3: Mining & Selling Products

```
Setup: Player has spawned a Miner with WoodCube product
       and a SellZone

Loop iteration:
    │
(1) BaseMiner.startMining() loop continues
    │
(2) Miner waits 5 seconds
    │
(3) Miner calls spawnProduct(spawnPosition)
    │
(4) WoodCube.create() returns new Model in Workspace
    │  └─ Sets ProductValue = 1
    │  └─ Sets ProductOwnerUserId = player.UserId
    │  └─ Schedules destruction after 30 seconds
    │
(5) Wood cube spawns above the miner
    │
(6) Cube falls down (gravity enabled)
    │
(7) Cube falls onto SellZone (Touched event fires)
    │
(8) SellZone.trySellProduct() executes
    │  ├─ Check not already selling
    │  ├─ Extract ProductValue (1) from attributes
    │  ├─ Extract ProductOwnerUserId from attributes
    │  ├─ Get player by UserId
    │  ├─ addCoins(player, 1)
    │  ├─ Fire UpdateBalance remote
    │  └─ Destroy product model
    │
(9) Player sees coins increase on UI
    │
(10) Loop repeats
```

---

## Module Dependency Graph

```
main.server.ts
    ├─ shared/remotes.ts (getRemotes)
    ├─ server/miner.ts (startMiningLoop)
    ├─ server/upgrade.ts (onBuyUpgrade)
    ├─ server/Models/Conveyors/BaseConveyor.ts
    ├─ server/Models/spawnUtils.ts (getPlayerSpawnPosition)
    └─ server/Models/SellZone.ts (initializeSellZones)

server/data.ts
    ├─ shared/types.ts (PlayerData)
    ├─ server/plot.ts (assignPlot, releasePlot, spawnPlayerAtPlot)
    └─ Players service

server/miner.ts
    ├─ shared/types.ts (PlayerData import for types)
    ├─ server/data.ts (addCoins, getPlayerData, getBalance)
    ├─ shared/remotes.ts (getRemotes)
    └─ Players service

server/upgrade.ts
    ├─ shared/types.ts (UPGRADES, Upgrade type)
    ├─ server/data.ts (getPlayerData)
    ├─ shared/remotes.ts (getRemotes)
    ├─ server/Models/Miners/BaseMiner.ts
    └─ server/Models/spawnUtils.ts

server/plot.ts
    ├─ Workspace service
    └─ No other module dependencies (pure plot logic)

server/Models/Miners/BaseMiner.ts
    └─ server/Models/Miners/MinerClass.ts (extends)
        └─ server/Models/Products/WoodCube.ts (composition)
            └─ server/Models/Products/Products.d.ts (interface)

server/Models/Conveyors/BaseConveyor.ts
    └─ server/Models/Conveyors/ConveyorClass.ts (extends)

server/Models/SellZone.ts
    ├─ Players service
    ├─ server/data.ts (addCoins, getBalance)
    └─ shared/remotes.ts (getRemotes)

server/Models/spawnUtils.ts
    ├─ ReplicatedStorage service
    ├─ Workspace service
    └─ No module dependencies (pure utility)

main.client.tsx
    ├─ Players service
    ├─ shared/remotes.ts (getRemotes)
    └─ React / React-Roblox libraries

client/ui/components/GameUI.tsx
    ├─ React library
    └─ client/ui/components/UpgradeShop.tsx

client/ui/components/UpgradeShop.tsx
    ├─ React library
    ├─ shared/types.ts (UPGRADES)
    └─ No server dependencies
```

---

## Initialization Order

```
Game starts
    │
    ▼
main.server.ts runs
    │
    └─► task.spawn(() => {
        │
        (1) getRemotes() - Initializes RemoteEvent folder
        │   └─ Creates/finds Remotes folder in ReplicatedStorage
        │   └─ Creates/finds each RemoteEvent (BuyUpgrade, UpdateBalance, etc.)
        │
        (2) task.spawn(() => startMiningLoop())
        │   └─ Enters infinite loop: every 1 sec, add coins to all players
        │
        (3) initializeSellZones()
        │   └─ Finds existing sell zones in Workspace
        │   └─ Binds Touched event to each
        │   └─ Listens for future DescendantAdded
        │
        (4) remotes.BuyUpgrade.OnServerEvent.Connect(...)
        │   └─ Ready to receive upgrade requests
        │
        (5) remotes.SpawnConveyor.OnServerEvent.Connect(...)
        │   └─ Ready to receive conveyor spawn requests
        │
        └─ Initialization complete, systems running
```

```
Player joins
    │
    ▼
data.ts:onPlayerAdded() fires
    │
    ├─ Create PlayerData entry
    ├─ assignPlot(player) from plot.ts
    │  └─ Finds free slot
    │  └─ Creates Plot_X folder in Workspace
    │  └─ Sets PlotPosition attribute
    │
    ├─ Listen for CharacterAdded event
    │
    └─ (If character already exists in Studio, spawn immediately)
        │
        ▼
    spawnPlayerAtPlot(player, character)
        │
        ├─ Get plot position via getPlotPosition()
        ├─ Wait for HumanoidRootPart
        └─ Teleport character to position above plot
```

```
main.client.tsx runs when LocalPlayer loads
    │
    ├─ Get PlayerGui
    ├─ getRemotes()
    │
    └─ Mount GameUIWrapper
        │
        ├─ Create React state for balance, multiplier, shopOpen
        │
        ├─ remotes.UpdateBalance.OnClientEvent.Connect(...)
        │  └─ Listen for server balance updates
        │
        ├─ remotes.UpdateMultiplier.OnClientEvent.Connect(...)
        │  └─ Listen for server multiplier updates
        │
        ├─ Define event handlers:
        │  ├─ handleBuyUpgrade → remotes.BuyUpgrade.FireServer()
        │  └─ handleSpawnConveyor → remotes.SpawnConveyor.FireServer()
        │
        └─ Render UI to PlayerGui
            │
            ├─ Display balance, multiplier
            ├─ Show shop toggle button
            ├─ Show spawn conveyor button
            └─ Conditionally show upgrade shop
```

---

## Key Design Principles

### 1. Single Responsibility

Each module has one clear job:
- `data.ts`: Player data storage
- `miner.ts`: Mining loop
- `upgrade.ts`: Upgrade processing
- `plot.ts`: Plot management
- `remotes.ts`: Networking
- `Models/`: Entity behavior

### 2. Server as Authority

- Server owns all state
- Server validates all changes
- Server broadcasts results to clients
- Clients never modify state directly

### 3. Type Safety

- `TypedRemoteEvent<TArgs>` for compile-time checking
- Discriminated unions (`type: "multiplier" | "spawner"`)
- Strict TypeScript mode enabled
- No `any` types

### 4. Lifecycle Management

- Events disconnected when no longer needed
- Models destroyed to prevent memory leaks
- Connection tracking (activeZones set)
- Cleanup on destruction (Destroying.Connect)

### 5. Composition Over Inheritance

- Products are composed into Miners
- Conveyors are independent entities
- SellZones are separate from Miners

### 6. Attributes for Data

- Metadata travels with instances via SetAttribute
- No separate state management for instance-bound data
- Server-side queries find correct values

---

## Performance Considerations

1. **Mining Loop Efficiency**
   - O(n) per player per second
   - n = number of connected players
   - Acceptable: 1 operation per player per second

2. **Sell Zone Registry**
   - O(1) existence check with Set
   - Prevents duplicate event handlers
   - Minimal memory overhead

3. **Plot Assignment**
   - O(5) since max 5 plots
   - Linear search, but small constant

4. **RemoteEvent Batching**
   - Could batch multiple updates in single remote call
   - Currently fires 2 remotes per upgrade (balance + multiplier)
   - Acceptable for current scale

5. **Attribute Access**
   - O(1) lookups on Models via GetAttribute
   - Preferred over separate data structures

---

## Error Handling

### Server-Side

```typescript
// Validation prevents bad states
if (!data || !upgrade) {
  return false; // Fail gracefully
}

if (data.coins < upgrade.cost) {
  print(`❌ Insufficient funds`);
  return false;
}
```

### Null Safety

```typescript
// Check before accessing
const primaryPart = spawnedModel.PrimaryPart;
if (!primaryPart) {
  error(`Template has no primary part`);
}

const hrp = character.WaitForChild("HumanoidRootPart", 5);
if (!hrp || !hrp.IsA("BasePart")) {
  return; // Silently fail if timeout
}
```

### Event Connection Cleanup

```typescript
// Ensure cleanup even if errors occur
instance.Destroying.Connect(() => {
  connection.Disconnect(); // Always called
  activeZones.delete(instance);
});
```

---

## Testing Considerations

### What's Easy to Test

- Pure functions: `getPlayerData()`, `getBalance()`
- Upgrade validation logic
- Type checking with TypeScript compiler

### What Requires Integration Testing

- RemoteEvent communication (needs client + server)
- Entity spawning and destruction
- Player lifecycle (join/leave)

### Manual Testing Checklist

- [ ] Join as player, see spawn at plot
- [ ] Passive income adds coins every second
- [ ] Buy multiplier upgrade, see multiplier increase
- [ ] Spawn miner, see products spawn
- [ ] Sell zone converts products to coins
- [ ] Spawn conveyor, see items transported
- [ ] Leave and rejoin, new plot assigned
- [ ] Two players don't interfere with each other
