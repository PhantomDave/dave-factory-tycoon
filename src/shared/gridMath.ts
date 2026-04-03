import { GRID_CELL_SIZE, GridCoord, MACHINE_SIZES, PLOT_SIZE_STUDS } from "shared/types";

const SNAP_EPSILON = 1e-4;

function snapToCell(value: number): number {
	return math.round(value / GRID_CELL_SIZE) * GRID_CELL_SIZE;
}

function normalizeDegrees(value: number): number {
	return ((value % 360) + 360) % 360;
}

function getPlotRotationCFrame(plotRotationDegrees = 0): CFrame {
	return CFrame.Angles(0, math.rad(normalizeDegrees(plotRotationDegrees)), 0);
}

function getPlotCFrame(plotCenter: Vector3, plotRotationDegrees = 0): CFrame {
	return new CFrame(plotCenter).mul(getPlotRotationCFrame(plotRotationDegrees));
}

/**
 * `PlotPosition` stores the center of the plot.
 * Convert between world space and the plot's own local grid so placements stay
 * aligned even when different plots are rotated differently.
 */
export function getPlotMinCorner(plotCenter: Vector3, plotRotationDegrees = 0): Vector3 {
	const halfPlotSize = PLOT_SIZE_STUDS / 2;
	const worldMinCorner = getPlotCFrame(plotCenter, plotRotationDegrees).PointToWorldSpace(
		new Vector3(-halfPlotSize, 0, -halfPlotSize),
	);

	return new Vector3(snapToCell(worldMinCorner.X), plotCenter.Y, snapToCell(worldMinCorner.Z));
}

/**
 * Convert a world position to a grid coordinate.
 * When machineType is provided, snapping is center-biased so the footprint
 * center tracks the cursor rather than the top-left corner.
 */
export function worldToGridCoord(
	worldPos: Vector3,
	plotOrigin: Vector3,
	machineType?: string,
	plotRotationDegrees = 0,
): GridCoord {
	const size = machineType ? (MACHINE_SIZES[machineType] ?? { width: 1, height: 1 }) : { width: 1, height: 1 };
	const halfPlotSize = PLOT_SIZE_STUDS / 2;
	const localPosition = getPlotCFrame(plotOrigin, plotRotationDegrees).PointToObjectSpace(worldPos);
	const localX = (localPosition.X + halfPlotSize) / GRID_CELL_SIZE;
	const localZ = (localPosition.Z + halfPlotSize) / GRID_CELL_SIZE;

	return {
		x: math.floor(localX - (size.width - 1) / 2 + SNAP_EPSILON),
		z: math.floor(localZ - (size.height - 1) / 2 + SNAP_EPSILON),
	};
}

export function gridCoordToWorldPos(
	coord: GridCoord,
	plotOrigin: Vector3,
	machineType: string,
	plotRotationDegrees = 0,
): Vector3 {
	const size = MACHINE_SIZES[machineType] ?? { width: 1, height: 1 };
	const halfPlotSize = PLOT_SIZE_STUDS / 2;
	const localX = -halfPlotSize + coord.x * GRID_CELL_SIZE + (size.width * GRID_CELL_SIZE) / 2;
	const localZ = -halfPlotSize + coord.z * GRID_CELL_SIZE + (size.height * GRID_CELL_SIZE) / 2;
	const worldPosition = getPlotCFrame(plotOrigin, plotRotationDegrees).PointToWorldSpace(
		new Vector3(localX, 0, localZ),
	);

	return new Vector3(snapToCell(worldPosition.X), plotOrigin.Y, snapToCell(worldPosition.Z));
}
