export interface PlayerData {
	playerId: number;
	coins: number;
	multiplier: number;
	unlockedUpgrades: string[];
	lastChecked: number;
}

export interface Upgrade {
	id: string;
	cost: number;
	multiplier?: number;
	displayName: string;
	type?: "multiplier" | "spawner";
	spawnerTemplate?: string;
	spawnerType?: "model" | "wood_cube";
}

export const UPGRADES: Record<string, Upgrade> = {
	base_miner_spawner: {
		id: "base_miner_spawner",
		cost: 0,
		displayName: "Spawn Miner",
		type: "spawner",
		spawnerTemplate: "BaseMiner",
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
