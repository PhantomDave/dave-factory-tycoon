// Mining configuration
export const MINING_CONFIG = {
	BASE_INTERVAL_SECONDS: 5,
	UPGRADED_INTERVAL_SECONDS: 3,
	MAX_MINERS_PER_PLAYER: 10,
} as const;

// Upgrade costs and multipliers
export const UPGRADE_CONFIG = {
	basicPickaxe: {
		cost: 10,
		multiplier: 2,
	},
	goldPickaxe: {
		cost: 100,
		multiplier: 5,
	},
} as const;

// Plot configuration
export const PLOT_CONFIG = {
	SPACING: 50,
	MAX_PLOTS: 10,
} as const;
