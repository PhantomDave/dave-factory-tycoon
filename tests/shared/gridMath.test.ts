// Import setup manually to ensure globals are defined
import "../setup/roblox-globals";

// Now Vector3 should be available
if (!(global as any).Vector3) {
	throw new Error("Vector3 not available after importing setup");
}

import { gridCoordToWorldPos, getPlotMinCorner, worldToGridCoord } from "shared/gridMath";

// Convenience alias so tests read as Vector3(x, y, z)
const Vec3 = (x: number, y: number, z: number) => new (global as any).Vector3(x, y, z);

const ORIGIN = Vec3(0, 0, 0);
const HALF_PLOT = 25; // PLOT_SIZE_STUDS / 2

// ---------------------------------------------------------------------------
// gridCoordToWorldPos
// ---------------------------------------------------------------------------
describe("gridCoordToWorldPos", () => {
	describe("no rotation", () => {
		it("maps coord (0,0) BaseMiner to the correct world position", () => {
			// BaseMiner is 2×2; localX = -25 + 0 + 1 = -24, same for Z
			const result = gridCoordToWorldPos({ x: 0, z: 0 }, ORIGIN, "BaseMiner", 0);
			expect(result.X).toBeCloseTo(-24);
			expect(result.Z).toBeCloseTo(-24);
			expect(result.Y).toBe(0);
		});

		it("maps coord (1,1) BaseMiner correctly", () => {
			// localX = -25 + 1 + 1 = -23
			const result = gridCoordToWorldPos({ x: 1, z: 1 }, ORIGIN, "BaseMiner", 0);
			expect(result.X).toBeCloseTo(-23);
			expect(result.Z).toBeCloseTo(-23);
		});

		it("maps coord (5,5) BaseMiner correctly", () => {
			// localX = -25 + 5 + 1 = -19
			const result = gridCoordToWorldPos({ x: 5, z: 5 }, ORIGIN, "BaseMiner", 0);
			expect(result.X).toBeCloseTo(-19);
			expect(result.Z).toBeCloseTo(-19);
		});

		it("preserves the plotOrigin Y value", () => {
			const elevated = Vec3(0, 10, 0);
			const result = gridCoordToWorldPos({ x: 0, z: 0 }, elevated, "BaseMiner", 0);
			expect(result.Y).toBe(10);
		});

		it("offsets world position by plotOrigin XZ", () => {
			const shifted = Vec3(100, 0, 200);
			const result = gridCoordToWorldPos({ x: 0, z: 0 }, shifted, "BaseMiner", 0);
			// localX = -24, localZ = -24 → world = (100-24, 0, 200-24) = (76, 0, 176)
			expect(result.X).toBeCloseTo(76);
			expect(result.Z).toBeCloseTo(176);
		});
	});

	describe("90° rotation", () => {
		it("rotates coord (1,1) BaseMiner correctly at 90°", () => {
			// With 90° rotation: worldX = localZ, worldZ = -localX
			// localX = -23, localZ = -23 → world = (-23, 0, 23)
			const result = gridCoordToWorldPos({ x: 1, z: 1 }, ORIGIN, "BaseMiner", 90);
			expect(result.X).toBeCloseTo(-23);
			expect(result.Z).toBeCloseTo(23);
		});

		it("rotates coord (5,5) BaseMiner correctly at 90°", () => {
			// localX = -19, localZ = -19 → world = (-19, 0, 19)
			const result = gridCoordToWorldPos({ x: 5, z: 5 }, ORIGIN, "BaseMiner", 90);
			expect(result.X).toBeCloseTo(-19);
			expect(result.Z).toBeCloseTo(19);
		});
	});

	describe("180° rotation", () => {
		it("mirrors coord (1,1) BaseMiner at 180°", () => {
			// With 180° rotation: worldX = -localX, worldZ = -localZ
			// localX = -23, localZ = -23 → world = (23, 0, 23)
			const result = gridCoordToWorldPos({ x: 1, z: 1 }, ORIGIN, "BaseMiner", 180);
			expect(result.X).toBeCloseTo(23);
			expect(result.Z).toBeCloseTo(23);
		});
	});
});

// ---------------------------------------------------------------------------
// worldToGridCoord
// ---------------------------------------------------------------------------
describe("worldToGridCoord", () => {
	it("converts a world position back to the originating grid coord (no rotation)", () => {
		// For BaseMiner at (1,1) with no rotation world = (-23, 0, -23)
		const worldPos = Vec3(-23, 0, -23);
		const result = worldToGridCoord(worldPos, ORIGIN, "BaseMiner", 0);
		expect(result.x).toBe(1);
		expect(result.z).toBe(1);
	});

	it("roundtrips coord (5,5) BaseMiner with 0° rotation", () => {
		const coord = { x: 5, z: 5 };
		const worldPos = gridCoordToWorldPos(coord, ORIGIN, "BaseMiner", 0);
		const result = worldToGridCoord(worldPos, ORIGIN, "BaseMiner", 0);
		expect(result.x).toBe(coord.x);
		expect(result.z).toBe(coord.z);
	});

	it("roundtrips coord (5,5) BaseMiner with 90° rotation", () => {
		const coord = { x: 5, z: 5 };
		const worldPos = gridCoordToWorldPos(coord, ORIGIN, "BaseMiner", 90);
		const result = worldToGridCoord(worldPos, ORIGIN, "BaseMiner", 90);
		expect(result.x).toBe(coord.x);
		expect(result.z).toBe(coord.z);
	});

	it("roundtrips coord (5,5) BaseMiner with 180° rotation", () => {
		const coord = { x: 5, z: 5 };
		const worldPos = gridCoordToWorldPos(coord, ORIGIN, "BaseMiner", 180);
		const result = worldToGridCoord(worldPos, ORIGIN, "BaseMiner", 180);
		expect(result.x).toBe(coord.x);
		expect(result.z).toBe(coord.z);
	});

	it("roundtrips coord (5,5) BaseMiner with 270° rotation", () => {
		const coord = { x: 5, z: 5 };
		const worldPos = gridCoordToWorldPos(coord, ORIGIN, "BaseMiner", 270);
		const result = worldToGridCoord(worldPos, ORIGIN, "BaseMiner", 270);
		expect(result.x).toBe(coord.x);
		expect(result.z).toBe(coord.z);
	});

	it("roundtrips multiple coords at non-zero plot origin", () => {
		const plotOrigin = Vec3(100, 5, 200);
		for (const coord of [
			{ x: 0, z: 0 },
			{ x: 10, z: 10 },
			{ x: 24, z: 24 },
		]) {
			const worldPos = gridCoordToWorldPos(coord, plotOrigin, "BaseMiner", 0);
			const result = worldToGridCoord(worldPos, plotOrigin, "BaseMiner", 0);
			expect(result.x).toBe(coord.x);
			expect(result.z).toBe(coord.z);
		}
	});
});

// ---------------------------------------------------------------------------
// getPlotMinCorner
// ---------------------------------------------------------------------------
describe("getPlotMinCorner", () => {
	it("returns (-HALF_PLOT, originY, -HALF_PLOT) for no rotation at origin", () => {
		const result = getPlotMinCorner(ORIGIN, 0);
		expect(result.X).toBeCloseTo(-HALF_PLOT);
		expect(result.Z).toBeCloseTo(-HALF_PLOT);
		expect(result.Y).toBe(0);
	});

	it("offsets the corner by plotCenter XZ", () => {
		const center = Vec3(100, 0, 200);
		const result = getPlotMinCorner(center, 0);
		expect(result.X).toBeCloseTo(100 - HALF_PLOT);
		expect(result.Z).toBeCloseTo(200 - HALF_PLOT);
	});

	it("preserves plotCenter Y", () => {
		const center = Vec3(0, 15, 0);
		const result = getPlotMinCorner(center, 0);
		expect(result.Y).toBe(15);
	});

	it("rotates the min-corner for a 90° rotated plot", () => {
		// At 90° rotation, PointToWorldSpace(-25, 0, -25) →
		// worldX = localZ = -25, worldZ = -localX = 25
		const result = getPlotMinCorner(ORIGIN, 90);
		expect(result.X).toBeCloseTo(-HALF_PLOT);
		expect(result.Z).toBeCloseTo(HALF_PLOT);
	});
});
