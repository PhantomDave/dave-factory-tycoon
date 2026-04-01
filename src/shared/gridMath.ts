import { GRID_CELL_SIZE, GridCoord, MACHINE_SIZES } from "shared/types";

const SNAP_EPSILON = 1e-4;

/**
 * plotOrigin is the minimum X/Z corner of the build plot (as stored in PLOT_POSITIONS).
 * This is an identity helper kept for call-site clarity.
 */
export function getPlotMinCorner(plotOrigin: Vector3): Vector3 {
	return plotOrigin;
}

/**
 * Convert a world position to a grid coordinate.
 * When machineType is provided, snapping is center-biased so the footprint
 * center tracks the cursor rather than the top-left corner.
 */
export function worldToGridCoord(worldPos: Vector3, plotOrigin: Vector3, machineType?: string): GridCoord {
	const size = machineType ? (MACHINE_SIZES[machineType] ?? { width: 1, height: 1 }) : { width: 1, height: 1 };
	const localX = (worldPos.X - plotOrigin.X) / GRID_CELL_SIZE;
	const localZ = (worldPos.Z - plotOrigin.Z) / GRID_CELL_SIZE;

	return {
		x: math.floor(localX - (size.width - 1) / 2 + SNAP_EPSILON),
		z: math.floor(localZ - (size.height - 1) / 2 + SNAP_EPSILON),
	};
}

export function gridCoordToWorldPos(coord: GridCoord, plotOrigin: Vector3, machineType: string): Vector3 {
	const size = MACHINE_SIZES[machineType] ?? { width: 1, height: 1 };

	const worldX = plotOrigin.X + coord.x * GRID_CELL_SIZE + (size.width * GRID_CELL_SIZE) / 2;
	const worldZ = plotOrigin.Z + coord.z * GRID_CELL_SIZE + (size.height * GRID_CELL_SIZE) / 2;

	return new Vector3(worldX, plotOrigin.Y, worldZ);
}
