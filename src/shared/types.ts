export interface TycoonData {
	Coins: number;
	Multipliers: number;
	UnlockedUpgrades: string[];
	LastChecked: number;
}

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