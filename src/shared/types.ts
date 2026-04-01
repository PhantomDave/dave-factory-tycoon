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
	basic_pickaxe: {
		id: "basic_pickaxe",
		cost: 10,
		multiplier: 2,
		displayName: "Basic Pickaxe",
		type: "multiplier",
	},
	gold_pickaxe: {
		id: "gold_pickaxe",
		cost: 100,
		multiplier: 5,
		displayName: "Gold Pickaxe",
		type: "multiplier",
	},
};
