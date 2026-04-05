import { RECIPES, canCraft, getRecipeByResult } from "shared/recipes";
import type { ItemID, Recipe } from "shared/recipes";

// ---------------------------------------------------------------------------
// RECIPES constant
// ---------------------------------------------------------------------------
describe("RECIPES", () => {
	it("defines all four expected recipe IDs", () => {
		expect(Object.keys(RECIPES)).toEqual(
			expect.arrayContaining(["copper_wire", "steel_ingot", "mechanical_assembly", "hardwood_table"]),
		);
	});

	describe("copper_wire (Tier 1 – Extruder)", () => {
		const recipe: Recipe = RECIPES["copper_wire"];

		it("requires 1× copper_ore", () => {
			expect(recipe.ingredients["copper_ore"]).toBe(1);
		});

		it("produces copper_wire", () => {
			expect(recipe.result).toBe("copper_wire");
		});

		it("has a processingTime of 4 seconds", () => {
			expect(recipe.processingTime).toBe(4);
		});
	});

	describe("steel_ingot (Tier 1 – Furnace)", () => {
		const recipe: Recipe = RECIPES["steel_ingot"];

		it("requires 1× iron_ore", () => {
			expect(recipe.ingredients["iron_ore"]).toBe(1);
		});

		it("requires 1× coal", () => {
			expect(recipe.ingredients["coal"]).toBe(1);
		});

		it("produces steel_ingot", () => {
			expect(recipe.result).toBe("steel_ingot");
		});

		it("has a processingTime of 6 seconds", () => {
			expect(recipe.processingTime).toBe(6);
		});
	});

	describe("mechanical_assembly (Tier 2 – Press)", () => {
		const recipe: Recipe = RECIPES["mechanical_assembly"];

		it("requires 2× copper_wire", () => {
			expect(recipe.ingredients["copper_wire"]).toBe(2);
		});

		it("requires 1× steel_ingot", () => {
			expect(recipe.ingredients["steel_ingot"]).toBe(1);
		});

		it("produces mechanical_assembly", () => {
			expect(recipe.result).toBe("mechanical_assembly");
		});

		it("has a processingTime of 8 seconds", () => {
			expect(recipe.processingTime).toBe(8);
		});
	});

	describe("hardwood_table (Tier 2 – Assembler I)", () => {
		const recipe: Recipe = RECIPES["hardwood_table"];

		it("requires 3× wood_log", () => {
			expect(recipe.ingredients["wood_log"]).toBe(3);
		});

		it("requires 1× steel_ingot", () => {
			expect(recipe.ingredients["steel_ingot"]).toBe(1);
		});

		it("produces hardwood_table", () => {
			expect(recipe.result).toBe("hardwood_table");
		});

		it("has a processingTime of 10 seconds", () => {
			expect(recipe.processingTime).toBe(10);
		});
	});
});

// ---------------------------------------------------------------------------
// getRecipeByResult
// ---------------------------------------------------------------------------
describe("getRecipeByResult", () => {
	it("returns the copper_wire recipe when looking up copper_wire", () => {
		const recipe = getRecipeByResult("copper_wire");
		expect(recipe).toBeDefined();
		expect(recipe!.result).toBe("copper_wire");
	});

	it("returns the steel_ingot recipe when looking up steel_ingot", () => {
		const recipe = getRecipeByResult("steel_ingot");
		expect(recipe).toBeDefined();
		expect(recipe!.result).toBe("steel_ingot");
	});

	it("returns the mechanical_assembly recipe when looking up mechanical_assembly", () => {
		const recipe = getRecipeByResult("mechanical_assembly");
		expect(recipe).toBeDefined();
		expect(recipe!.result).toBe("mechanical_assembly");
	});

	it("returns the hardwood_table recipe when looking up hardwood_table", () => {
		const recipe = getRecipeByResult("hardwood_table");
		expect(recipe).toBeDefined();
		expect(recipe!.result).toBe("hardwood_table");
	});

	it("returns undefined for an ItemID that is not a recipe result", () => {
		const recipe = getRecipeByResult("copper_ore" as ItemID);
		expect(recipe).toBeUndefined();
	});
});

// ---------------------------------------------------------------------------
// canCraft
// ---------------------------------------------------------------------------
describe("canCraft", () => {
	describe("copper_wire", () => {
		it("returns true when the exact required amount is available", () => {
			expect(canCraft("copper_wire", { copper_ore: 1 })).toBe(true);
		});

		it("returns true when more than the required amount is available", () => {
			expect(canCraft("copper_wire", { copper_ore: 5 })).toBe(true);
		});

		it("returns false when the ingredient is missing", () => {
			expect(canCraft("copper_wire", {})).toBe(false);
		});

		it("returns false when the quantity is insufficient", () => {
			expect(canCraft("copper_wire", { copper_ore: 0 })).toBe(false);
		});
	});

	describe("steel_ingot", () => {
		it("returns true when both iron_ore and coal are available", () => {
			expect(canCraft("steel_ingot", { iron_ore: 1, coal: 1 })).toBe(true);
		});

		it("returns false when coal is missing", () => {
			expect(canCraft("steel_ingot", { iron_ore: 1 })).toBe(false);
		});

		it("returns false when iron_ore is missing", () => {
			expect(canCraft("steel_ingot", { coal: 1 })).toBe(false);
		});
	});

	describe("mechanical_assembly", () => {
		it("returns true with 2× copper_wire and 1× steel_ingot", () => {
			expect(canCraft("mechanical_assembly", { copper_wire: 2, steel_ingot: 1 })).toBe(true);
		});

		it("returns false when copper_wire count is insufficient", () => {
			expect(canCraft("mechanical_assembly", { copper_wire: 1, steel_ingot: 1 })).toBe(false);
		});

		it("returns false when steel_ingot is missing", () => {
			expect(canCraft("mechanical_assembly", { copper_wire: 2 })).toBe(false);
		});
	});

	describe("hardwood_table", () => {
		it("returns true with 3× wood_log and 1× steel_ingot", () => {
			expect(canCraft("hardwood_table", { wood_log: 3, steel_ingot: 1 })).toBe(true);
		});

		it("returns false when wood_log count is insufficient", () => {
			expect(canCraft("hardwood_table", { wood_log: 2, steel_ingot: 1 })).toBe(false);
		});
	});

	it("returns false for an unknown recipe ID", () => {
		expect(canCraft("nonexistent_recipe", { copper_ore: 10 })).toBe(false);
	});
});
