import { GRID_CELL_SIZE, GridCoord, MACHINE_SIZES, PLOT_SIZE_STUDS } from "shared/types";

const SNAP_EPSILON = 1e-4;

function snapToCell(value: number): number {
	return math.round(value / GRID_CELL_SIZE) * GRID_CELL_SIZE;
}

/**
 * In this repo, `PlotPosition` stores the center of the plot.
 * Convert that center point to the minimum X/Z corner before any grid math,
 * then snap it to the cell size so tiny imported decimal offsets do not skew the overlay.
 */
export function getPlotMinCorner(plotCenter: Vector3): Vector3 {
	const halfPlotSize = PLOT_SIZE_STUDS / 2;
	return new Vector3(snapToCell(plotCenter.X - halfPlotSize), plotCenter.Y, snapToCell(plotCenter.Z - halfPlotSize));
}

/**
 * Convert a world position to a grid coordinate.
 * When machineType is provided, snapping is center-biased so the footprint
 * center tracks the cursor rather than the top-left corner.
 */
export function worldToGridCoord(worldPos: Vector3, plotOrigin: Vector3, machineType?: string): GridCoord {
	const size = machineType ? (MACHINE_SIZES[machineType] ?? { width: 1, height: 1 }) : { width: 1, height: 1 };
	const plotMinCorner = getPlotMinCorner(plotOrigin);
	const localX = (worldPos.X - plotMinCorner.X) / GRID_CELL_SIZE;
	const localZ = (worldPos.Z - plotMinCorner.Z) / GRID_CELL_SIZE;

	return {
		x: math.floor(localX - (size.width - 1) / 2 + SNAP_EPSILON),
		z: math.floor(localZ - (size.height - 1) / 2 + SNAP_EPSILON),
	};
}

export function gridCoordToWorldPos(coord: GridCoord, plotOrigin: Vector3, machineType: string): Vector3 {
	const size = MACHINE_SIZES[machineType] ?? { width: 1, height: 1 };
	const plotMinCorner = getPlotMinCorner(plotOrigin);

	const worldX = plotMinCorner.X + coord.x * GRID_CELL_SIZE + (size.width * GRID_CELL_SIZE) / 2;
	const worldZ = plotMinCorner.Z + coord.z * GRID_CELL_SIZE + (size.height * GRID_CELL_SIZE) / 2;

	return new Vector3(worldX, plotOrigin.Y, worldZ);
}
