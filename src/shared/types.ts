import { UPGRADE_CONFIG } from "shared/constants";

export interface MachineData {
	id: string;
	position: { X: number; Y: number; Z: number };
	rotation: { RX: number; RY: number; RZ: number };
	state: string;
}

export interface PlayerData {
	playerId: number;
	coins: number;
	multiplier: number;
	unlockedUpgrades: string[];
	lastChecked: number;
	machines: MachineData[];
}

interface BaseUpgrade {
	id: string;
	cost: number;
	displayName: string;
}

export interface MachineSize {
	width: number; // grid cells wide
	height: number; // grid cells tall
}

export const MACHINE_SIZES: Record<string, MachineSize> = {
	BaseMiner: { width: 2, height: 2 },
	Conveyor: { width: 1, height: 1 },
	SellZone: { width: 1, height: 1 },
};

export interface MultiplierUpgrade extends BaseUpgrade {
	type: "multiplier";
	multiplier: number;
}

export interface SpawnerUpgrade extends BaseUpgrade {
	type: "spawner";
	spawnerTemplate: string;
	spawnerType: "model" | "wood_cube";
}

export interface GridCoord {
	x: number;
	z: number;
}

/** Which face of a miner products are ejected toward. */
export type DropSide = "top" | "front" | "back" | "left" | "right";

export interface PlaceRequest {
	machineType: string;
	coord: GridCoord;
	/** Top-surface Y from the client's raycast, used by the server to sit models on the plate. */
	surfaceY: number;
	/** Number of clockwise 90-degree turns (0-3) applied during placement. */
	rotationQuarterTurns: number;
}

export interface PlaceResponse {
	success: boolean;
	reason?: string;
}

export const PLOT_SIZE = 50; // 50x50 cells per plot
export const PLOT_SIZE_STUDS = 50; // actual plot size in studs (50x1x50)
export const GRID_CELL_SIZE = PLOT_SIZE_STUDS / PLOT_SIZE; // 1 stud per cell

export type Upgrade = MultiplierUpgrade | SpawnerUpgrade;

export const UPGRADES: Record<string, Upgrade> = {
	base_miner_spawner: {
		id: "base_miner_spawner",
		cost: 0,
		displayName: "Spawn Miner",
		type: "spawner",
		spawnerTemplate: "BaseMiner",
		spawnerType: "model",
	},
	sell_zone_spawner: {
		id: "sell_zone_spawner",
		cost: 0,
		displayName: "Spawn Sell Zone",
		type: "spawner",
		spawnerTemplate: "SellZone",
		spawnerType: "model",
	},
	conveyor_spawner: {
		id: "conveyor_spawner",
		cost: 0,
		displayName: "Spawn Conveyor",
		type: "spawner",
		spawnerTemplate: "Conveyor",
		spawnerType: "model",
	},
	basic_pickaxe: {
		id: "basic_pickaxe",
		cost: UPGRADE_CONFIG.basicPickaxe.cost,
		multiplier: UPGRADE_CONFIG.basicPickaxe.multiplier,
		displayName: "Basic Pickaxe",
		type: "multiplier",
	},
	gold_pickaxe: {
		id: "gold_pickaxe",
		cost: UPGRADE_CONFIG.goldPickaxe.cost,
		multiplier: UPGRADE_CONFIG.goldPickaxe.multiplier,
		displayName: "Gold Pickaxe",
		type: "multiplier",
	},
};
