import { GRID_CELL_SIZE, GridCoord, MACHINE_SIZES, PLOT_SIZE_STUDS } from "shared/types";

const SNAP_EPSILON = 1e-4;

/**
 * PlotPosition is treated as the center of the square build plot.
 * Placement grid math operates on the minimum X/Z corner.
 */
export function getPlotMinCorner(plotCenter: Vector3): Vector3 {
	const half = PLOT_SIZE_STUDS / 2;
	return new Vector3(plotCenter.X - half, plotCenter.Y, plotCenter.Z - half);
}

export function worldToGridCoord(worldPos: Vector3, plotCenter: Vector3): GridCoord {
	const minCorner = getPlotMinCorner(plotCenter);
	const localX = (worldPos.X - minCorner.X) / GRID_CELL_SIZE;
	const localZ = (worldPos.Z - minCorner.Z) / GRID_CELL_SIZE;

	return {
		x: math.floor(localX + SNAP_EPSILON),
		z: math.floor(localZ + SNAP_EPSILON),
	};
}

export function gridCoordToWorldPos(coord: GridCoord, plotCenter: Vector3, machineType: string): Vector3 {
	const minCorner = getPlotMinCorner(plotCenter);
	const size = MACHINE_SIZES[machineType] || { width: 1, height: 1 };

	const worldX = minCorner.X + coord.x * GRID_CELL_SIZE + (size.width * GRID_CELL_SIZE) / 2;
	const worldZ = minCorner.Z + coord.z * GRID_CELL_SIZE + (size.height * GRID_CELL_SIZE) / 2;

	return new Vector3(worldX, plotCenter.Y, worldZ);
}
