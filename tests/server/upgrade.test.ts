// Module mocks must be declared before imports so Jest can hoist them.
jest.mock("server/utils/logger", () => ({
	logger: {
		info: jest.fn(),
		warn: jest.fn(),
		error: jest.fn(),
		debug: jest.fn(),
	},
}));

jest.mock("server/data", () => ({
	getPlayerData: jest.fn(),
	addCoins: jest.fn(),
}));

jest.mock("shared/remotes", () => ({
	getRemotes: jest.fn(),
}));

jest.mock("server/models/miners/baseMiner", () => ({
	BaseMiner: jest.fn().mockImplementation(() => ({
		spawn: jest.fn(),
	})),
}));

jest.mock("server/models/spawnUtils", () => ({
	getPlayerSpawnPosition: jest.fn(() => new (global as any).Vector3(0, 0, 0)),
	spawnTemplateModel: jest.fn(),
}));

import { onBuyUpgrade } from "server/upgrade";
import { getPlayerData, addCoins } from "server/data";
import { getRemotes } from "shared/remotes";
import { UPGRADE_CONFIG } from "shared/constants";

const mockGetPlayerData = getPlayerData as jest.Mock;
const mockAddCoins = addCoins as jest.Mock;
const mockGetRemotes = getRemotes as jest.Mock;

/** Create a mock Player object. */
function makePlayer(name = "TestPlayer", userId = 1): any {
	return { Name: name, UserId: userId };
}

describe("onBuyUpgrade", () => {
	const player = makePlayer();

	let mockFireClient: jest.Mock;

	beforeEach(() => {
		jest.clearAllMocks();
		mockFireClient = jest.fn();
		mockGetRemotes.mockReturnValue({
			UpdateBalance: { FireClient: mockFireClient },
			UpdateMultiplier: { FireClient: mockFireClient },
		});
	});

	// -------------------------------------------------------------------------
	// Failure paths
	// -------------------------------------------------------------------------
	it("returns false for an unknown upgrade ID", () => {
		mockGetPlayerData.mockReturnValue({ coins: 100, unlockedUpgrades: [], multiplier: 1 });
		expect(onBuyUpgrade(player, "nonexistent_upgrade")).toBe(false);
	});

	it("returns false when player data is unavailable", () => {
		mockGetPlayerData.mockReturnValue(undefined);
		expect(onBuyUpgrade(player, "basic_pickaxe")).toBe(false);
	});

	it("returns false when the upgrade is already owned", () => {
		mockGetPlayerData.mockReturnValue({
			coins: 100,
			unlockedUpgrades: ["basic_pickaxe"],
			multiplier: 3,
		});
		expect(onBuyUpgrade(player, "basic_pickaxe")).toBe(false);
	});

	it("returns false when the player cannot afford the upgrade", () => {
		mockGetPlayerData.mockReturnValue({
			coins: UPGRADE_CONFIG.basicPickaxe.cost - 1,
			unlockedUpgrades: [],
			multiplier: 1,
		});
		expect(onBuyUpgrade(player, "basic_pickaxe")).toBe(false);
	});

	it("does not deduct coins when validation fails", () => {
		mockGetPlayerData.mockReturnValue({
			coins: 0,
			unlockedUpgrades: [],
			multiplier: 1,
		});
		onBuyUpgrade(player, "basic_pickaxe");
		expect(mockAddCoins).not.toHaveBeenCalled();
	});

	it("does not fire any remote event when validation fails", () => {
		mockGetPlayerData.mockReturnValue(undefined);
		onBuyUpgrade(player, "basic_pickaxe");
		expect(mockFireClient).not.toHaveBeenCalled();
	});

	// -------------------------------------------------------------------------
	// Successful multiplier upgrade – basic_pickaxe
	// -------------------------------------------------------------------------
	it("returns true for a valid basic_pickaxe purchase", () => {
		mockGetPlayerData.mockReturnValue({
			coins: UPGRADE_CONFIG.basicPickaxe.cost,
			unlockedUpgrades: [],
			multiplier: 1,
		});
		expect(onBuyUpgrade(player, "basic_pickaxe")).toBe(true);
	});

	it("adds the upgrade to unlockedUpgrades on success", () => {
		const data = { coins: 50, unlockedUpgrades: [] as string[], multiplier: 1 };
		mockGetPlayerData.mockReturnValue(data);
		onBuyUpgrade(player, "basic_pickaxe");
		expect(data.unlockedUpgrades).toContain("basic_pickaxe");
	});

	it("increases the multiplier by the correct amount", () => {
		const data = { coins: 50, unlockedUpgrades: [] as string[], multiplier: 1 };
		mockGetPlayerData.mockReturnValue(data);
		onBuyUpgrade(player, "basic_pickaxe");
		expect(data.multiplier).toBe(1 + UPGRADE_CONFIG.basicPickaxe.multiplier);
	});

	it("deducts the correct coin amount via addCoins", () => {
		mockGetPlayerData.mockReturnValue({ coins: 50, unlockedUpgrades: [], multiplier: 1 });
		onBuyUpgrade(player, "basic_pickaxe");
		expect(mockAddCoins).toHaveBeenCalledWith(player, -UPGRADE_CONFIG.basicPickaxe.cost);
	});

	it("fires UpdateMultiplier with the new multiplier value", () => {
		const data = { coins: 50, unlockedUpgrades: [] as string[], multiplier: 1 };
		mockGetPlayerData.mockReturnValue(data);
		onBuyUpgrade(player, "basic_pickaxe");
		expect(mockFireClient).toHaveBeenCalledWith(player, 1 + UPGRADE_CONFIG.basicPickaxe.multiplier);
	});

	// -------------------------------------------------------------------------
	// Successful multiplier upgrade – gold_pickaxe
	// -------------------------------------------------------------------------
	it("allows purchasing gold_pickaxe with sufficient coins", () => {
		const data = {
			coins: UPGRADE_CONFIG.goldPickaxe.cost,
			unlockedUpgrades: [] as string[],
			multiplier: 1,
		};
		mockGetPlayerData.mockReturnValue(data);
		const result = onBuyUpgrade(player, "gold_pickaxe");
		expect(result).toBe(true);
		expect(data.multiplier).toBe(1 + UPGRADE_CONFIG.goldPickaxe.multiplier);
		expect(mockAddCoins).toHaveBeenCalledWith(player, -UPGRADE_CONFIG.goldPickaxe.cost);
	});

	it("allows buying both multiplier upgrades sequentially", () => {
		const data = {
			coins: UPGRADE_CONFIG.basicPickaxe.cost + UPGRADE_CONFIG.goldPickaxe.cost,
			unlockedUpgrades: [] as string[],
			multiplier: 1,
		};
		mockGetPlayerData.mockReturnValue(data);

		// Buy basic_pickaxe first
		expect(onBuyUpgrade(player, "basic_pickaxe")).toBe(true);
		data.coins -= UPGRADE_CONFIG.basicPickaxe.cost; // simulate addCoins side-effect

		// Buy gold_pickaxe second
		expect(onBuyUpgrade(player, "gold_pickaxe")).toBe(true);
		expect(data.unlockedUpgrades).toContain("basic_pickaxe");
		expect(data.unlockedUpgrades).toContain("gold_pickaxe");
	});

	// -------------------------------------------------------------------------
	// Free spawner upgrade – base_miner_spawner (cost: 0)
	// -------------------------------------------------------------------------
	it("allows purchasing a free spawner upgrade with 0 coins", () => {
		const data = { coins: 0, unlockedUpgrades: [] as string[], multiplier: 1 };
		mockGetPlayerData.mockReturnValue(data);
		const result = onBuyUpgrade(player, "base_miner_spawner");
		expect(result).toBe(true);
		expect(data.unlockedUpgrades).toContain("base_miner_spawner");
	});

	it("deducts zero coins for a free spawner upgrade", () => {
		mockGetPlayerData.mockReturnValue({ coins: 0, unlockedUpgrades: [], multiplier: 1 });
		onBuyUpgrade(player, "base_miner_spawner");
		// The upgrade cost is 0; addCoins is called with -cost which is -0 in JS.
		// Explicitly match -0 to document the expected (if trivial) behaviour.
		expect(mockAddCoins).toHaveBeenCalledWith(player, -0);
	});

	it("allows purchasing a free conveyor_spawner upgrade", () => {
		const data = { coins: 0, unlockedUpgrades: [] as string[], multiplier: 1 };
		mockGetPlayerData.mockReturnValue(data);
		const result = onBuyUpgrade(player, "conveyor_spawner");
		expect(result).toBe(true);
		expect(data.unlockedUpgrades).toContain("conveyor_spawner");
	});

	// -------------------------------------------------------------------------
	// Exact coin boundary
	// -------------------------------------------------------------------------
	it("succeeds when player has exactly the upgrade cost (boundary condition)", () => {
		mockGetPlayerData.mockReturnValue({
			coins: UPGRADE_CONFIG.basicPickaxe.cost,
			unlockedUpgrades: [],
			multiplier: 1,
		});
		expect(onBuyUpgrade(player, "basic_pickaxe")).toBe(true);
	});

	it("fails when player has one coin fewer than the upgrade cost (boundary condition)", () => {
		mockGetPlayerData.mockReturnValue({
			coins: UPGRADE_CONFIG.basicPickaxe.cost - 1,
			unlockedUpgrades: [],
			multiplier: 1,
		});
		expect(onBuyUpgrade(player, "basic_pickaxe")).toBe(false);
	});
});
