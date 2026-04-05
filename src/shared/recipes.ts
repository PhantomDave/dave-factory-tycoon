/** All item identifiers used as recipe inputs and outputs. */
export type ItemID =
	| "copper_ore"
	| "iron_ore"
	| "coal"
	| "wood_log"
	| "copper_wire"
	| "steel_ingot"
	| "mechanical_assembly"
	| "hardwood_table";

/** Stable identifiers for every defined recipe. */
export type RecipeID = "copper_wire" | "steel_ingot" | "mechanical_assembly" | "hardwood_table";

/** A single crafting recipe definition. */
export interface Recipe {
	/** Map of required item IDs to the quantity needed. */
	ingredients: { [K in ItemID]?: number };
	/** The item produced when this recipe is completed. */
	result: ItemID;
	/** Time in seconds to process this recipe. */
	processingTime: number;
}

/**
 * All recipes, keyed by a stable recipe ID.
 *
 * Tier 1 — produced by Furnace / Extruder:
 *   copper_wire    : 1× copper_ore  → 1× copper_wire    (Extruder, 4 s)
 *   steel_ingot    : 1× iron_ore + 1× coal → 1× steel_ingot (Furnace, 6 s)
 *
 * Tier 2 — produced by Press / Assembler I:
 *   mechanical_assembly : 2× copper_wire + 1× steel_ingot → 1× mechanical_assembly (Press, 8 s)
 *   hardwood_table      : 3× wood_log   + 1× steel_ingot → 1× hardwood_table      (Assembler I, 10 s)
 */
export const RECIPES: Record<RecipeID, Recipe> = {
	copper_wire: {
		ingredients: { copper_ore: 1 },
		result: "copper_wire",
		processingTime: 4,
	},
	steel_ingot: {
		ingredients: { iron_ore: 1, coal: 1 },
		result: "steel_ingot",
		processingTime: 6,
	},
	mechanical_assembly: {
		ingredients: { copper_wire: 2, steel_ingot: 1 },
		result: "mechanical_assembly",
		processingTime: 8,
	},
	hardwood_table: {
		ingredients: { wood_log: 3, steel_ingot: 1 },
		result: "hardwood_table",
		processingTime: 10,
	},
} as const;

/**
 * Look up a recipe by its result item ID.
 * Returns the first recipe whose result matches, or undefined if none exists.
 */
export function getRecipeByResult(resultId: ItemID): Recipe | undefined {
	for (const [, recipe] of pairs(RECIPES)) {
		if (recipe.result === resultId) {
			return recipe;
		}
	}
	return undefined;
}

/**
 * Returns true when `id` is a known RecipeID.
 * Use this to guard untrusted string inputs (e.g. remote payloads) before calling `canCraft`.
 */
export function isRecipeID(id: string): id is RecipeID {
	return (RECIPES as Record<string, Recipe | undefined>)[id] !== undefined;
}

/**
 * Check whether the given ingredient map satisfies the requirements of a recipe.
 * @param recipeId  A valid RecipeID key. Use `isRecipeID` to guard untrusted string inputs.
 * @param available Map of available item IDs to their quantities.
 * @returns true when every required ingredient is present in sufficient quantity.
 */
export function canCraft(recipeId: RecipeID, available: Partial<Record<ItemID, number>>): boolean {
	const recipe = RECIPES[recipeId];

	for (const [itemId, required] of pairs(recipe.ingredients)) {
		if (required === undefined) continue;
		const have = available[itemId as ItemID] ?? 0;
		if (have < required) return false;
	}
	return true;
}
