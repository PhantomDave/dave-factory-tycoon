# 🛠️ Project: Bit-Miner Tycoon (TS Edition)

**Agile Development Roadmap | Full-Stack Roblox-TS + Roact UI**

---

## 🏗️ 1. Technical Stack & Architecture

| Component        | Technology                                                     | Notes                                                          |
| ---------------- | -------------------------------------------------------------- | -------------------------------------------------------------- |
| **Language**     | TypeScript → Luau                                              | roblox-ts compiler                                             |
| **File Sync**    | Rojo                                                           | Watches `src/` → transpiles to `out/` → syncs to Roblox Studio |
| **State Model**  | Server-Authoritative                                           | Single source of truth on server; client validates locally     |
| **UI Framework** | Roact (React-like)                                             | Component-based UI, reactive state (npm: @rbxts/roact)         |
| **Networking**   | RemoteEvents + RemoteFunction                                  | Safe client→server communication                               |
| **Scripting**    | ModuleScript (Shared) + LocalScript (Client) + Script (Server) | Standard Roblox structure                                      |

---

## 🚀 2. Quick Start (< 5 minutes)

```bash
# Install dependencies (includes Roact)
npm install @rbxts/roact

# Terminal 1: Watch TypeScript compilation
npm run watch

# Terminal 2: Run Rojo (in Roblox Studio)
rojo serve default.project.json
```

**In Roblox Studio:**

- Click the Rojo plugin "Connect" button
- You'll see the TypeScript code synced to three places:
    - `ServerScriptService.TS.main` → Your server code
    - `StarterPlayer.StarterPlayerScripts.TS.main` → Your client code
    - `ReplicatedStorage.TS.*` → Shared modules

---

## 📋 3. Agile Development Roadmap

### **Sprint 0: Foundation & Setup** (1-2 hours)

- Define data contracts
- Setup networking layer
- Configure Roact dependencies

### **Sprint 1: Core Server & Passive Income** (2-3 hours)

- Server entry point & player management
- Miner loop (passive income)
- Data persistence (in-memory initially)

### **Sprint 2: Reactive UI with Roact** (2-3 hours)

- Create Roact components (balance display, buttons)
- Client event listeners
- Real-time balance sync

### **Sprint 3: Upgrade System** (2-3 hours)

- Upgrade purchase logic
- Server-side validation
- UI integration with upgrade shop

### **Sprint 4: Polish & Advanced** (After MVP)

- DataStore persistence
- Offline earnings
- Visual effects & animations

---

## 💎 4. Data Schema (The Contract)

**File:** `src/shared/types.ts`

```typescript
export interface TycoonData {
	Coins: number;
	Multipliers: number;
	UnlockedUpgrades: string[];
	LastChecked: number; // Unix timestamp for offline earnings
}

export interface Upgrade {
	id: string;
	cost: number;
	multiplier: number;
	displayName: string;
}

export const UPGRADES: Record<string, Upgrade> = {
	basic_pickaxe: {
		id: "basic_pickaxe",
		cost: 10,
		multiplier: 2,
		displayName: "Basic Pickaxe",
	},
	gold_pickaxe: {
		id: "gold_pickaxe",
		cost: 100,
		multiplier: 5,
		displayName: "Gold Pickaxe",
	},
};
```

---

## 🔌 5. Networking Setup

**File:** `src/shared/remotes.ts`

```typescript
import { ReplicatedStorage } from "@rbxts/services";

// Create or get RemoteEvents
export function getRemotes() {
	let remotes = ReplicatedStorage.FindFirstChild("Remotes");
	if (!remotes) {
		remotes = new Instance("Folder");
		remotes.Name = "Remotes";
		remotes.Parent = ReplicatedStorage;
	}

	const folder = remotes as Folder;

	function ensureRemote(name: string) {
		let remote = folder.FindFirstChild(name) as RemoteEvent | undefined;
		if (!remote) {
			remote = new Instance("RemoteEvent");
			remote.Name = name;
			remote.Parent = folder;
		}
		return remote;
	}

	return {
		PlayerJoined: ensureRemote("PlayerJoined"),
		BuyUpgrade: ensureRemote("BuyUpgrade"),
		UpdateBalance: ensureRemote("UpdateBalance"),
		UpdateMultiplier: ensureRemote("UpdateMultiplier"),
	};
}

export type Remotes = ReturnType<typeof getRemotes>;
```

---

## 📁 6. Project Structure

```
src/
├── shared/
│   ├── module.ts          (Hello world - remove when ready)
│   ├── types.ts           (Interfaces & game constants)
│   └── remotes.ts         (Networking setup)
├── server/
│   ├── main.server.ts     (Entry point)
│   ├── data.ts            (DataStore manager)
│   ├── miner.ts           (Passive income loop)
│   ├── upgrade.ts         (Buy logic & validation)
│   └── builder.ts         (Spawn miner visuals)
└── client/
    ├── main.client.ts     (Entry point)
    ├── ui.ts              (ScreenGui creation)
    └── input.ts           (Button listeners)

out/                       (Auto-generated, synced to Roblox)
├── server/
├── shared/
└── client/
```

---

## ⚙️ 7. Implementation Reference

### Step 1: Initialize RemoteEvents

**File:** `src/shared/remotes.ts` → `src/server/main.server.ts`

```typescript
// src/server/main.server.ts
import { getRemotes } from "shared/remotes";

const remotes = getRemotes();
print("✅ Remotes initialized:", remotes);
```

### Step 2: Player Balance Tracking

**File:** `src/server/data.ts`

```typescript
import { Players, DataStoreService } from "@rbxts/services";

const playerBalances = new Map<Player, number>();

function onPlayerAdded(player: Player) {
	playerBalances.set(player, 0); // Start with 0 coins
	print(`📊 ${player.Name} loaded: 0 coins`);
}

function onPlayerRemoving(player: Player) {
	const balance = playerBalances.get(player) ?? 0;
	print(`💾 Saving ${player.Name}: ${balance} coins`);
	playerBalances.delete(player);
}

Players.PlayerAdded.Connect(onPlayerAdded);
Players.PlayerRemoving.Connect(onPlayerRemoving);

export function getBalance(player: Player): number {
	return playerBalances.get(player) ?? 0;
}

export function addCoins(player: Player, amount: number): void {
	const current = getBalance(player);
	playerBalances.set(player, current + amount);
}
```

### Step 3: Passive Income (Core Game Loop)

**File:** `src/server/miner.ts`

```typescript
import { Players } from "@rbxts/services";
import { getBalance, addCoins } from "./data";

export function startMiningLoop() {
	while (true) {
		wait(1); // Tick once per second

		for (const player of Players.GetPlayers()) {
			addCoins(player, 1); // +1 coin per second
			print(`💰 ${player.Name}: ${getBalance(player)}`);
		}
	}
}
```

### Step 4: UI Display

**File:** `src/client/ui.ts`

```typescript
import { Players, UserInputService } from "@rbxts/services";

const player = Players.LocalPlayer;
const playerGui = player.WaitForChild("PlayerGui") as PlayerGui;

// Create ScreenGui
const screenGui = new Instance("ScreenGui");
screenGui.Name = "GameUI";
screenGui.ResetOnSpawn = false;
screenGui.Parent = playerGui;

// Balance Label
const balanceLabel = new Instance("TextLabel");
balanceLabel.Name = "BalanceLabel";
balanceLabel.Size = new UDim2(0, 200, 0, 50);
balanceLabel.Position = new UDim2(0, 10, 0, 10);
balanceLabel.BackgroundColor3 = Color3.fromRGB(0, 100, 255);
balanceLabel.TextColor3 = Color3.fromRGB(255, 255, 255);
balanceLabel.TextSize = 24;
balanceLabel.Font = Enum.Font.GothamBold;
balanceLabel.Text = "Coins: 0";
balanceLabel.Parent = screenGui;

// Buy Button
const buyButton = new Instance("TextButton");
buyButton.Name = "BuyButton";
buyButton.Size = new UDim2(0, 150, 0, 50);
buyButton.Position = new UDim2(0, 10, 0, 70);
buyButton.BackgroundColor3 = Color3.fromRGB(0, 200, 100);
buyButton.TextColor3 = Color3.fromRGB(255, 255, 255);
buyButton.TextSize = 20;
buyButton.Font = Enum.Font.GothamBold;
buyButton.Text = "Buy (+10)";
buyButton.Parent = screenGui;

export { screenGui, balanceLabel, buyButton };
```

---

## 👥 4. User Stories & Sprint Breakdown

### **SPRINT 0: Foundation & Setup**

**Duration:** 1-2 hours
**Goal:** Establish data contracts, networking, and project structure

#### US-01: Define Game Data Schema

**As a** developer
**I want** to have a clear data structure for player state
**So that** server and client can stay in sync

**Acceptance Criteria:**

- ✅ `src/shared/types.ts` defines `PlayerData` interface
- ✅ `Upgrade` interface with id, cost, multiplier, displayName
- ✅ Predefined upgrades exported as `UPGRADES` constant

**Technical Tasks:**

```typescript
// src/shared/types.ts (SPRINT 0 DELIVERABLE)
export interface PlayerData {
	playerId: string;
	coins: number;
	multiplier: number;
	unlockedUpgrades: string[];
	lastChecked: number;
}

export interface Upgrade {
	id: string;
	cost: number;
	multiplier: number;
	displayName: string;
}

export const UPGRADES: Record<string, Upgrade> = {
	basic_pickaxe: {
		id: "basic_pickaxe",
		cost: 10,
		multiplier: 2,
		displayName: "Basic Pickaxe",
	},
	gold_pickaxe: {
		id: "gold_pickaxe",
		cost: 100,
		multiplier: 5,
		displayName: "Gold Pickaxe",
	},
};
```

---

#### US-02: Setup Client-Server Communication

**As a** developer
**I want** to have RemoteEvents for player actions
**So that** client can safely trigger server-side logic

**Acceptance Criteria:**

- ✅ RemoteEvents created in `ReplicatedStorage.Remotes`
- ✅ Available events: `BuyUpgrade`, `UpdateBalance`
- ✅ Type-safe remote event access

**Technical Tasks:**

```typescript
// src/shared/remotes.ts (SPRINT 0 DELIVERABLE)
import { ReplicatedStorage } from "@rbxts/services";

export function getRemotes() {
	let remotes = ReplicatedStorage.FindFirstChild("Remotes");
	if (!remotes) {
		remotes = new Instance("Folder");
		remotes.Name = "Remotes";
		remotes.Parent = ReplicatedStorage;
	}

	const folder = remotes as Folder;

	function ensureRemote(name: string) {
		let remote = folder.FindFirstChild(name) as RemoteEvent | undefined;
		if (!remote) {
			remote = new Instance("RemoteEvent");
			remote.Name = name;
			remote.Parent = folder;
		}
		return remote;
	}

	return {
		BuyUpgrade: ensureRemote("BuyUpgrade"),
		UpdateBalance: ensureRemote("UpdateBalance"),
	};
}

export type Remotes = ReturnType<typeof getRemotes>;
```

---

#### US-03: Install & Configure Roact UI Framework

**As a** developer
**I want** to use React-like components for UI
**So that** UI state management is declarative and maintainable

**Acceptance Criteria:**

- ✅ `@rbxts/roact` installed via npm
- ✅ Roact imported successfully in client code
- ✅ Can render Roact components to playerGui

**Technical Tasks:**

```bash
npm install @rbxts/roact
```

Test in `src/client/main.client.ts`:

```typescript
import Roact from "@rbxts/roact";

// Verify Roact works
print("✅ Roact imported successfully");
```

---

### **SPRINT 1: Core Server & Passive Income**

**Duration:** 2-3 hours
**Goal:** Implement server loop for passive income, player data tracking

#### US-04: Track Player Join/Leave Events

**As a** player
**I want** my data to be loaded when I join
**So that** my game state persists across sessions

**Acceptance Criteria:**

- ✅ Player join logged to output
- ✅ Player data initialized in memory
- ✅ Player leave logged to output
- ✅ Print shows coin balance on join

**Technical Tasks:**

```typescript
// src/server/data.ts (SPRINT 1 DELIVERABLE)
import { Players } from "@rbxts/services";
import { PlayerData } from "shared/types";

const playerData = new Map<Player, PlayerData>();

function onPlayerAdded(player: Player) {
	const data: PlayerData = {
		playerId: player.UserId.toString(),
		coins: 0,
		multiplier: 1,
		unlockedUpgrades: [],
		lastChecked: os.time(),
	};
	playerData.set(player, data);
	print(`✅ ${player.Name} joined with ${data.coins} coins`);
}

function onPlayerRemoving(player: Player) {
	const data = playerData.get(player);
	if (data) {
		print(`💾 Saving ${player.Name}: ${data.coins} coins`);
		playerData.delete(player);
	}
}

Players.PlayerAdded.Connect(onPlayerAdded);
Players.PlayerRemoving.Connect(onPlayerRemoving);

export function getPlayerData(player: Player): PlayerData | undefined {
	return playerData.get(player);
}

export function addCoins(player: Player, amount: number): void {
	const data = getPlayerData(player);
	if (data) {
		data.coins += amount;
	}
}
```

---

#### US-05: Implement Passive Income Loop

**As a** player
**I want** to earn coins passively each second
**So that** I can progress in the game without doing anything

**Acceptance Criteria:**

- ✅ Miner loop runs every 1 second
- ✅ All players gain +1 coin per tick
- ✅ Console logs balance change
- ✅ Loop can be called from server main

**Technical Tasks:**

```typescript
// src/server/miner.ts (SPRINT 1 DELIVERABLE)
import { Players } from "@rbxts/services";
import { getPlayerData, addCoins } from "./data";

export function startMiningLoop(): void {
	while (true) {
		task.wait(1); // Tick once per second

		const players = Players.GetPlayers();
		for (const player of players) {
			addCoins(player, 1);
			const data = getPlayerData(player);
			if (data) {
				print(`💰 ${player.Name}: ${data.coins} coins`);
			}
		}
	}
}
```

---

#### US-06: Initialize Server Entry Point

**As a** developer
**I want** the server to automatically start systems
**So that** the game runs without manual intervention

**Acceptance Criteria:**

- ✅ `src/server/main.server.ts` calls data + miner setup
- ✅ Console shows "Server running" message
- ✅ Miner loop starts and prints coin updates

**Technical Tasks:**

```typescript
// src/server/main.server.ts (SPRINT 1 DELIVERABLE)
import { getRemotes } from "shared/remotes";
import { startMiningLoop } from "server/miner";

print("🚀 Server starting...");

// Initialize networking
const remotes = getRemotes();
print("✅ Remotes initialized");

// Start passive income loop
task.spawn(() => startMiningLoop());
print("✅ Mining loop started");
```

---

### **SPRINT 2: Reactive UI with Roact**

**Duration:** 2-3 hours
**Goal:** Build component-based UI, sync balance in real-time

#### US-07: Create Roact Game UI Component

**As a** player
**I want** to see my coin balance on the screen
**So that** I can track my progress

**Acceptance Criteria:**

- ✅ Roact component renders ScreenGui
- ✅ Balance label visible and styled
- ✅ UI updates reactively from state
- ✅ Component can be mounted to playerGui

**Technical Tasks:**

```typescript
// src/client/ui/components/GameUI.tsx (SPRINT 2 DELIVERABLE)
import Roact from "@rbxts/roact";

interface GameUIProps {
	balance: number;
	multiplier: number;
	onBuyClick?: () => void;
}

export function GameUI({ balance, multiplier, onBuyClick }: GameUIProps) {
	return (
		<Roact.Fragment>
			{/* Main Container */}
			<screengui
				Name="GameUI"
				ResetOnSpawn={false}
			>
				{/* Balance Display */}
				<textlabel
					Name="BalanceLabel"
					Size={new UDim2(0, 250, 0, 60)}
					Position={new UDim2(0, 20, 0, 20)}
					BackgroundColor3={Color3.fromRGB(0, 120, 255)}
					TextColor3={Color3.fromRGB(255, 255, 255)}
					TextSize={28}
					Font={Enum.Font.GothamBold}
					Text={`💰 Coins: ${balance}`}
					BorderSizePixel={0}
				/>

				{/* Multiplier Display */}
				<textlabel
					Name="MultiplierLabel"
					Size={new UDim2(0, 250, 0, 50)}
					Position={new UDim2(0, 20, 0, 90)}
					BackgroundColor3={Color3.fromRGB(100, 100, 100)}
					TextColor3={Color3.fromRGB(255, 255, 255)}
					TextSize={18}
					Font={Enum.Font.Gotham}
					Text={`Multiplier: x${multiplier}`}
					BorderSizePixel={0}
				/>

				{/* Buy Button */}
				<textbutton
					Name="BuyButton"
					Size={new UDim2(0, 200, 0, 50)}
					Position={new UDim2(0, 20, 0, 150)}
					BackgroundColor3={Color3.fromRGB(0, 200, 100)}
					TextColor3={Color3.fromRGB(255, 255, 255)}
					TextSize={20}
					Font={Enum.Font.GothamBold}
					Text="Buy Upgrade (+10)"
					BorderSizePixel={0}
					Event={{
						Activated: onBuyClick,
					}}
				/>
			</screengui>
		</Roact.Fragment>
	);
}
```

---

#### US-08: Connect Client to Balance Updates

**As a** player
**I want** my balance to update in real-time from the server
**So that** I see live progress

**Acceptance Criteria:**

- ✅ Client receives `UpdateBalance` RemoteEvent
- ✅ Roact component state updates
- ✅ UI re-renders with new balance
- ✅ Hand shake completed without lag

**Technical Tasks:**

```typescript
// src/client/main.client.ts (SPRINT 2 DELIVERABLE)
import Roact from "@rbxts/roact";
import { Players, ReplicatedStorage } from "@rbxts/services";
import { getRemotes } from "shared/remotes";
import { GameUI } from "client/ui/components/GameUI";

const player = Players.LocalPlayer;
const playerGui = player.WaitForChild("PlayerGui") as PlayerGui;
const remotes = getRemotes();

// State management
const state = {
	balance: 0,
	multiplier: 1,
};

// Create root
const root = Roact.createRoot(playerGui);
const tree = Roact.createElement(GameUI, {
	balance: state.balance,
	multiplier: state.multiplier,
	onBuyClick: () => {
		print("Buy button clicked!");
		remotes.BuyUpgrade.FireServer("basic_pickaxe");
	},
});

root.render(tree);

// Listen for balance updates
remotes.UpdateBalance.OnClientEvent.Connect((newBalance: number) => {
	state.balance = newBalance;
	const updated = Roact.createElement(GameUI, {
		balance: state.balance,
		multiplier: state.multiplier,
		onBuyClick: () => {
			remotes.BuyUpgrade.FireServer("basic_pickaxe");
		},
	});
	root.render(updated);
});

print("✅ Client UI mounted");
```

---

#### US-09: Send Balance Updates from Server to Clients

**As a** developer
**I want** the server to broadcast balance changes
**So that** all clients stay in sync

**Acceptance Criteria:**

- ✅ Server fires `UpdateBalance` after adding coins
- ✅ Event sends (player, newBalance) tuple
- ✅ All clients receive the event
- ✅ No performance issues at 60 updates/sec

**Technical Tasks:**
Update `src/server/miner.ts`:

```typescript
// Add to startMiningLoop function
export function startMiningLoop(): void {
	const remotes = getRemotes();

	while (true) {
		task.wait(1);

		for (const player of Players.GetPlayers()) {
			addCoins(player, 1);
			const data = getPlayerData(player);
			if (data) {
				// Send update to this client
				remotes.UpdateBalance.FireClient(player, data.coins);
				print(`💰 ${player.Name}: ${data.coins} coins`);
			}
		}
	}
}
```

---

### **SPRINT 3: Upgrade System**

**Duration:** 2-3 hours
**Goal:** Implement upgrade purchasing with validation

#### US-10: Create Upgrade Shop Component

**As a** player
**I want** to see available upgrades to purchase
**So that** I can spend coins to increase multiplier

**Acceptance Criteria:**

- ✅ Upgrade shop UI displays all upgrades
- ✅ Shows upgrade name, cost, and multiplier
- ✅ Buy button for each upgrade
- ✅ Button disabled if not enough coins

**Technical Tasks:**

```typescript
// src/client/ui/components/UpgradeShop.tsx (SPRINT 3 DELIVERABLE)
import Roact from "@rbxts/roact";
import { UPGRADES, Upgrade } from "shared/types";

interface UpgradeShopProps {
	balance: number;
	onBuyUpgrade: (upgradeId: string) => void;
}

export function UpgradeShop({ balance, onBuyUpgrade }: UpgradeShopProps) {
	const upgrades = Object.values(UPGRADES);

	return (
		<scrollingframe
			Name="UpgradeShop"
			Size={new UDim2(0, 300, 0, 400)}
			Position={new UDim2(0.65, 0, 0, 20)}
			BackgroundColor3={Color3.fromRGB(40, 40, 40)}
			BorderSizePixel={0}
			CanvasSize={new UDim2(0, 0, 0, upgrades.size() * 80)}
		>
			<uilistlayout
				Padding={new UDim(0, 10)}
				SortOrder={Enum.SortOrder.LayoutOrder}
			/>

			<Roact.Fragment>
				{upgrades.map((upgrade, index) => {
					const canAfford = balance >= upgrade.cost;
					return (
						<frame
							key={upgrade.id}
							Name={upgrade.id}
							Size={new UDim2(1, -10, 0, 70)}
							BackgroundColor3={Color3.fromRGB(60, 60, 60)}
							BorderSizePixel={1}
							BorderColor3={Color3.fromRGB(100, 100, 100)}
							LayoutOrder={index}
						>
							<textlabel
								Name="Name"
								Size={new UDim2(1, 0, 0, 20)}
								BackgroundTransparency={1}
								TextColor3={Color3.fromRGB(255, 255, 255)}
								TextSize={14}
								Font={Enum.Font.GothamBold}
								Text={upgrade.displayName}
							/>

							<textlabel
								Name="Stats"
								Size={new UDim2(1, 0, 0, 20)}
								Position={new UDim2(0, 0, 0, 20)}
								BackgroundTransparency={1}
								TextColor3={Color3.fromRGB(200, 200, 200)}
								TextSize={12}
								Font={Enum.Font.Gotham}
								Text={`Cost: ${upgrade.cost} | +${upgrade.multiplier}x`}
							/>

							<textbutton
								Name="BuyBtn"
								Size={new UDim2(1, 0, 0, 25)}
								Position={new UDim2(0, 0, 0, 45)}
								BackgroundColor3={canAfford ? Color3.fromRGB(0, 200, 100) : Color3.fromRGB(100, 100, 100)}
								TextColor3={Color3.fromRGB(255, 255, 255)}
								TextSize={12}
								Font={Enum.Font.GothamBold}
								Text={canAfford ? "Buy" : "Not Enough $"}
								Enabled={canAfford}
								Event={{
									Activated: () => onBuyUpgrade(upgrade.id),
								}}
							/>
						</frame>
					);
				})}
			</Roact.Fragment>
		</scrollingframe>
	);
}
```

---

#### US-11: Validate & Process Upgrade Purchases

**As a** developer
**I want** the server to validate upgrade purchases
**So that** players can't cheat by bypassing cost checks

**Acceptance Criteria:**

- ✅ Server checks player has enough coins
- ✅ Server deducts coins from player
- ✅ Server updates multiplier
- ✅ Malicious clients can't bypass checks
- ✅ Server sends confirmation to client

**Technical Tasks:**

```typescript
// src/server/upgrade.ts (SPRINT 3 DELIVERABLE)
import { Players } from "@rbxts/services";
import { UPGRADES } from "shared/types";
import { getPlayerData, addCoins } from "./data";
import { getRemotes } from "shared/remotes";

export function onBuyUpgrade(player: Player, upgradeId: string): boolean {
	const data = getPlayerData(player);
	const upgrade = UPGRADES[upgradeId];

	if (!data || !upgrade) {
		return false;
	}

	// Validate: has enough coins?
	if (data.coins < upgrade.cost) {
		print(`❌ ${player.Name} tried to buy but insufficient funds`);
		return false;
	}

	// Deduct coins & apply upgrade
	data.coins -= upgrade.cost;
	data.multiplier += upgrade.multiplier;
	data.unlockedUpgrades.push(upgradeId);

	print(`✅ ${player.Name} bought ${upgrade.displayName}`);

	// Notify client
	const remotes = getRemotes();
	remotes.UpdateBalance.FireClient(player, data.coins);

	return true;
}
```

---

#### US-12: Connect Upgrade Purchases to Server

**As a** player
**I want** to click buy on an upgrade
**So that** I can progress by spending coins

**Acceptance Criteria:**

- ✅ Clicking upgrade sends RemoteEvent to server
- ✅ Server processes purchase
- ✅ UI updates after confirmation
- ✅ Can't accidentally double-purchase

**Technical Tasks:**
Update `src/server/main.server.ts`:

```typescript
import { onBuyUpgrade } from "server/upgrade";

// ...existing code...

remotes.BuyUpgrade.OnServerEvent.Connect((player: Player, upgradeId: string) => {
	onBuyUpgrade(player, upgradeId);
});
```

Update `src/client/main.client.ts` to use UpgradeShop component in GameUI.

---

## 📁 7. Final Project Structure

```
src/
├── shared/
│   ├── types.ts              ✅ SPRINT 0
│   ├── remotes.ts            ✅ SPRINT 0
│   └── module.ts             (Remove after testing)
├── server/
│   ├── main.server.ts        ✅ SPRINT 1
│   ├── data.ts               ✅ SPRINT 1
│   ├── miner.ts              ✅ SPRINT 1 & 2
│   ├── upgrade.ts            ✅ SPRINT 3
│   └── builder.ts            (SPRINT 4: spawns visual models)
└── client/
    ├── main.client.ts        ✅ SPRINT 2
    └── ui/
        └── components/
            ├── GameUI.tsx    ✅ SPRINT 2
            └── UpgradeShop.tsx ✅ SPRINT 3

out/                          (Auto-generated)
├── server/
├── shared/
└── client/
```

---

## 📚 8. Roact vs Vanilla Roblox UI

| Feature              | Roact (Selected)       | Vanilla Roblox              |
| -------------------- | ---------------------- | --------------------------- |
| **Syntax**           | JSX-like, declarative  | Imperative property setting |
| **State Management** | Component state hooks  | Manual callbacks            |
| **Learning Curve**   | Familiar to React devs | Requires Roblox knowledge   |
| **Bundle Size**      | +20kb                  | None                        |
| **Hot Reload**       | Easier debugging       | Harder to iterate           |
| **Performance**      | Optimized for UI trees | Direct control              |

**Why Roact?** Easier to maintain large UIs, faster iteration, familiar syntax.

---

## 🧪 9. Testing Checklist (Per Sprint)

### Sprint 0

- [ ] `npm run watch` compiles without errors
- [ ] Types defined in `src/shared/types.ts`
- [ ] Remotes created in `ReplicatedStorage.Remotes`
- [ ] Roact module imported successfully

### Sprint 1

- [ ] Server prints "Server starting..."
- [ ] Join logs player with 0 coins
- [ ] Miner loop prints coin updates every second
- [ ] No errors in Output tab

### Sprint 2

- [ ] Roact UI renders on screen
- [ ] Balance label visible
- [ ] Buy button clickable
- [ ] Client receives UpdateBalance event

### Sprint 3

- [ ] Upgrade shop displays all upgrades
- [ ] Buy button disabled if not enough coins
- [ ] Clicking Buy fires RemoteEvent
- [ ] Server processes purchase and deducts coins
- [ ] UI updates after purchase

---

## 🐛 10. Common Issues & Fixes

| Issue                             | Cause                         | Fix                                              |
| --------------------------------- | ----------------------------- | ------------------------------------------------ |
| "Cannot find module @rbxts/roact" | Not installed                 | `npm install @rbxts/roact`                       |
| Roact components don't render     | Wrong parent (playerGui?)     | Use `playerGui.WaitForChild()` before rendering  |
| Balance doesn't update            | Remote not firing             | Add print() to confirm FireClient is called      |
| Buy button does nothing           | Event not connected on server | Check `onBuyUpgrade` is hooked in main.server.ts |
| UI appears then disappears        | ResetOnSpawn: true            | Set `ResetOnSpawn={false}` in ScreenGui          |

---

## 🎯 Post-MVP Features (Sprint 4+)

- [ ] DataStore persistence (save to cloud)
- [ ] Offline earnings calculation
- [ ] Tween animations for coin updates
- [ ] Sound effects on purchase
- [ ] Leaderboard
- [ ] Prestige system
- [ ] Visual miner models cloned to workspace
