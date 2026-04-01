import { UPGRADE_CONFIG } from "shared/constants";

export interface PlayerData {
	playerId: number;
	coins: number;
	multiplier: number;
	unlockedUpgrades: string[];
	lastChecked: number;
}

interface BaseUpgrade {
	id: string;
	cost: number;
	displayName: string;
}

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


export interface PlaceRequest {
  machineType: string;
  coord: GridCoord;
}

export interface PlaceResponse {
  success: boolean;
  reason?: string;
}

export const GRID_CELL_SIZE = 4;   // studs per cell (matches studio default grid)
export const GRID_COLS      = 20;  // columns per plot
export const GRID_ROWS      = 20;  // rows per plot

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
