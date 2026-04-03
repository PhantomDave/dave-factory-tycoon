// Module mocks must be declared before any imports so Jest can hoist them.
jest.mock("server/utils/logger", () => ({
	logger: {
		info: jest.fn(),
		warn: jest.fn(),
		error: jest.fn(),
		debug: jest.fn(),
	},
}));

jest.mock("server/plot", () => ({
	getPlotPosition: jest.fn(() => new (global as any).Vector3(0, 0, 0)),
	getPlotRotationDegrees: jest.fn(() => 0),
}));

jest.mock("shared/gridMath", () => ({
	gridCoordToWorldPos: jest.fn(() => new (global as any).Vector3(0, 0, 0)),
}));

import {
	clearPlayerGrid,
	getAdjacentDropSide,
	initPlayerGrid,
	occupyCell,
	validatePlacement,
} from "server/grid";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
/** Creates a unique mock Player object for each test. */
function makePlayer(name = "TestPlayer", userId = 1): any {
	return { Name: name, UserId: userId };
}

// ---------------------------------------------------------------------------
// validatePlacement
// ---------------------------------------------------------------------------
describe("validatePlacement", () => {
	let player: any;

	beforeEach(() => {
		player = makePlayer();
		initPlayerGrid(player);
	});

	afterEach(() => {
		clearPlayerGrid(player);
	});

	it("returns an error message for an unknown machine type", () => {
		const result = validatePlacement(player, { x: 0, z: 0 }, "UnknownMachine");
		expect(result).toBe("Unknown machine type: UnknownMachine");
	});

	it("returns undefined for a valid 1×1 placement inside the grid", () => {
		expect(validatePlacement(player, { x: 0, z: 0 }, "Conveyor")).toBeUndefined();
	});

	it("returns undefined for a valid 2×2 BaseMiner inside the grid", () => {
		expect(validatePlacement(player, { x: 0, z: 0 }, "BaseMiner")).toBeUndefined();
	});

	it("returns 'Out of bounds' for a negative x coordinate", () => {
		expect(validatePlacement(player, { x: -1, z: 0 }, "Conveyor")).toBe("Out of bounds");
	});

	it("returns 'Out of bounds' for a negative z coordinate", () => {
		expect(validatePlacement(player, { x: 0, z: -1 }, "Conveyor")).toBe("Out of bounds");
	});

	it("returns 'Out of bounds' when x equals PLOT_SIZE (50)", () => {
		expect(validatePlacement(player, { x: 50, z: 0 }, "Conveyor")).toBe("Out of bounds");
	});

	it("returns 'Out of bounds' when z equals PLOT_SIZE (50)", () => {
		expect(validatePlacement(player, { x: 0, z: 50 }, "Conveyor")).toBe("Out of bounds");
	});

	it("returns 'Out of bounds' when a 2×2 machine footprint exceeds the right boundary", () => {
		// BaseMiner (2×2) at x=49 would need cells 49 and 50; 50 is out of bounds
		expect(validatePlacement(player, { x: 49, z: 0 }, "BaseMiner")).toBe("Out of bounds");
	});

	it("returns 'Out of bounds' when a 2×2 machine footprint exceeds the bottom boundary", () => {
		expect(validatePlacement(player, { x: 0, z: 49 }, "BaseMiner")).toBe("Out of bounds");
	});

	it("accepts a 2×2 BaseMiner placed at the last valid corner (48,48)", () => {
		expect(validatePlacement(player, { x: 48, z: 48 }, "BaseMiner")).toBeUndefined();
	});

	it("returns 'Cell already occupied' when the target cell is taken", () => {
		occupyCell(player, { x: 5, z: 5 }, "Conveyor");
		expect(validatePlacement(player, { x: 5, z: 5 }, "Conveyor")).toBe("Cell already occupied");
	});

	it("returns 'Cell already occupied' when a 2×2 machine overlaps an occupied cell", () => {
		// Occupy cell (3,3) then try to place BaseMiner at (2,2) which covers (3,3)
		occupyCell(player, { x: 3, z: 3 }, "Conveyor");
		expect(validatePlacement(player, { x: 2, z: 2 }, "BaseMiner")).toBe("Cell already occupied");
	});

	it("allows placement adjacent to an occupied cell", () => {
		occupyCell(player, { x: 3, z: 3 }, "Conveyor");
		expect(validatePlacement(player, { x: 4, z: 3 }, "Conveyor")).toBeUndefined();
	});
});

// ---------------------------------------------------------------------------
// occupyCell
// ---------------------------------------------------------------------------
describe("occupyCell", () => {
	let player: any;

	beforeEach(() => {
		player = makePlayer();
		initPlayerGrid(player);
	});

	afterEach(() => {
		clearPlayerGrid(player);
	});

	it("marks exactly one cell for a 1×1 machine", () => {
		occupyCell(player, { x: 5, z: 5 }, "Conveyor");

		expect(validatePlacement(player, { x: 5, z: 5 }, "Conveyor")).toBe("Cell already occupied");
		// Neighbouring cells remain free
		expect(validatePlacement(player, { x: 6, z: 5 }, "Conveyor")).toBeUndefined();
		expect(validatePlacement(player, { x: 5, z: 6 }, "Conveyor")).toBeUndefined();
	});

	it("marks all four cells for a 2×2 BaseMiner", () => {
		occupyCell(player, { x: 2, z: 2 }, "BaseMiner");

		expect(validatePlacement(player, { x: 2, z: 2 }, "Conveyor")).toBe("Cell already occupied");
		expect(validatePlacement(player, { x: 3, z: 2 }, "Conveyor")).toBe("Cell already occupied");
		expect(validatePlacement(player, { x: 2, z: 3 }, "Conveyor")).toBe("Cell already occupied");
		expect(validatePlacement(player, { x: 3, z: 3 }, "Conveyor")).toBe("Cell already occupied");
	});

	it("does not mark cells outside the machine footprint", () => {
		occupyCell(player, { x: 2, z: 2 }, "BaseMiner");

		expect(validatePlacement(player, { x: 1, z: 2 }, "Conveyor")).toBeUndefined();
		expect(validatePlacement(player, { x: 4, z: 2 }, "Conveyor")).toBeUndefined();
		expect(validatePlacement(player, { x: 2, z: 1 }, "Conveyor")).toBeUndefined();
		expect(validatePlacement(player, { x: 2, z: 4 }, "Conveyor")).toBeUndefined();
	});

	it("records the machine type for each occupied cell (used by getAdjacentDropSide)", () => {
		occupyCell(player, { x: 0, z: 0 }, "Conveyor");
		// A BaseMiner adjacent should detect the Conveyor to its left
		occupyCell(player, { x: 1, z: 0 }, "BaseMiner");
		expect(getAdjacentDropSide(player, { x: 1, z: 0 }, "BaseMiner")).toBe("left");
	});
});

// ---------------------------------------------------------------------------
// getAdjacentDropSide
// ---------------------------------------------------------------------------
describe("getAdjacentDropSide", () => {
	let player: any;

	beforeEach(() => {
		player = makePlayer();
		initPlayerGrid(player);
	});

	afterEach(() => {
		clearPlayerGrid(player);
	});

	it("returns 'top' when no conveyor is adjacent", () => {
		occupyCell(player, { x: 5, z: 5 }, "BaseMiner");
		expect(getAdjacentDropSide(player, { x: 5, z: 5 }, "BaseMiner")).toBe("top");
	});

	it("returns 'right' when a Conveyor is directly to the right (+x side)", () => {
		// BaseMiner 2×2 at (5,5) → footprint columns 5-6; right-edge is x=7
		occupyCell(player, { x: 5, z: 5 }, "BaseMiner");
		occupyCell(player, { x: 7, z: 5 }, "Conveyor");
		expect(getAdjacentDropSide(player, { x: 5, z: 5 }, "BaseMiner")).toBe("right");
	});

	it("returns 'left' when a Conveyor is directly to the left (-x side)", () => {
		occupyCell(player, { x: 5, z: 5 }, "BaseMiner");
		occupyCell(player, { x: 4, z: 5 }, "Conveyor");
		expect(getAdjacentDropSide(player, { x: 5, z: 5 }, "BaseMiner")).toBe("left");
	});

	it("returns 'back' when a Conveyor is directly behind (+z side)", () => {
		// Back = +z; BaseMiner bottom edge at z=6, so z=7 is behind
		occupyCell(player, { x: 5, z: 5 }, "BaseMiner");
		occupyCell(player, { x: 5, z: 7 }, "Conveyor");
		expect(getAdjacentDropSide(player, { x: 5, z: 5 }, "BaseMiner")).toBe("back");
	});

	it("returns 'front' when a Conveyor is directly in front (-z side)", () => {
		occupyCell(player, { x: 5, z: 5 }, "BaseMiner");
		occupyCell(player, { x: 5, z: 4 }, "Conveyor");
		expect(getAdjacentDropSide(player, { x: 5, z: 5 }, "BaseMiner")).toBe("front");
	});

	it("returns 'top' for an unknown machine type", () => {
		expect(getAdjacentDropSide(player, { x: 5, z: 5 }, "UnknownMachine")).toBe("top");
	});

	it("right-side priority beats back when both are present", () => {
		occupyCell(player, { x: 5, z: 5 }, "BaseMiner");
		occupyCell(player, { x: 7, z: 5 }, "Conveyor"); // right
		occupyCell(player, { x: 5, z: 7 }, "Conveyor"); // back
		// Right is checked first in the implementation
		expect(getAdjacentDropSide(player, { x: 5, z: 5 }, "BaseMiner")).toBe("right");
	});
});

// ---------------------------------------------------------------------------
// initPlayerGrid / clearPlayerGrid
// ---------------------------------------------------------------------------
describe("initPlayerGrid / clearPlayerGrid", () => {
	it("fresh grid allows valid placement at any in-bounds coordinate", () => {
		const player = makePlayer("fresh", 99);
		initPlayerGrid(player);
		expect(validatePlacement(player, { x: 0, z: 0 }, "Conveyor")).toBeUndefined();
		expect(validatePlacement(player, { x: 49, z: 49 }, "Conveyor")).toBeUndefined();
		clearPlayerGrid(player);
	});

	it("re-initialising a grid resets all occupied cells", () => {
		const player = makePlayer("reinit", 100);
		initPlayerGrid(player);
		occupyCell(player, { x: 0, z: 0 }, "Conveyor");

		// Re-initialise should wipe the state
		initPlayerGrid(player);
		expect(validatePlacement(player, { x: 0, z: 0 }, "Conveyor")).toBeUndefined();
		clearPlayerGrid(player);
	});

	it("clearPlayerGrid removes the player's grid state", () => {
		const player = makePlayer("clear", 101);
		initPlayerGrid(player);
		occupyCell(player, { x: 10, z: 10 }, "BaseMiner");
		clearPlayerGrid(player);

		// After clearing, the ensurePlayerGrid fallback recreates an empty grid
		initPlayerGrid(player);
		expect(validatePlacement(player, { x: 10, z: 10 }, "Conveyor")).toBeUndefined();
		clearPlayerGrid(player);
	});
});
