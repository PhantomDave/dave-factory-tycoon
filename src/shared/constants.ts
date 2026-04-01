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

// Product configuration
export const PRODUCT_CONFIG = {
	woodCube: {
		lifetime: 30,
	},
} as const;

// Conveyor configuration
export const CONVEYOR_CONFIG = {
	baseSpeed: 1,
	updateInterval: 0.016,
} as const;

// Sell zone configuration
export const SELL_ZONE_CONFIG = {
	glowRange: 18,
	glowBrightness: 2.5,
} as const;
