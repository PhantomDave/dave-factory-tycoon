import { getPlotPosition } from "server/plot";
import { gridCoordToWorldPos } from "shared/gridMath";
import { DropSide, GridCoord, MACHINE_SIZES, PLOT_SIZE } from "shared/types";
import { logger } from "./utils/logger";

const occupancy = new Map<Player, Set<string>>();
const cellType = new Map<Player, Map<string, string>>();

function ensurePlayerGrid(player: Player): { occupied: Set<string>; types: Map<string, string> } {
	let occupied = occupancy.get(player);
	let types = cellType.get(player);

	if (!occupied || !types) {
		logger.warn(`Grid state missing for ${player.Name}; reinitializing.`);
		occupied = new Set<string>();
		types = new Map<string, string>();
		occupancy.set(player, occupied);
		cellType.set(player, types);
	}

	return { occupied, types };
}

export function initPlayerGrid(player: Player): void {
	occupancy.set(player, new Set());
	cellType.set(player, new Map());
}

export function clearPlayerGrid(player: Player): void {
	occupancy.delete(player);
	cellType.delete(player);
}

export function gridCoordToWorld(
	player: Player,
	coord: GridCoord,
	machineType: string,
	surfaceY?: number,
	rotationQuarterTurns = 0,
): CFrame {
	const plotCenter = getPlotPosition(player) ?? new Vector3(0, 0, 0);
	const worldPos = gridCoordToWorldPos(coord, plotCenter, machineType);
	const worldY = surfaceY ?? plotCenter.Y;
	const baseCFrame = new CFrame(worldPos.X, worldY, worldPos.Z);
	const rotation = CFrame.Angles(0, math.rad((rotationQuarterTurns % 4) * 90), 0);
	const worldCFrame = baseCFrame.mul(rotation);

	logger.debug(
		`Player: ${player.Name}, Grid: (${coord.x}, ${coord.z}) -> World: (${worldPos.X}, ${worldY}, ${worldPos.Z})`,
	);
	logger.debug(`Plot Center: (${plotCenter.X}, ${plotCenter.Y}, ${plotCenter.Z})`);

	return worldCFrame;
}

export function validatePlacement(player: Player, coord: GridCoord, machineType: string): string | undefined {
	const size = MACHINE_SIZES[machineType];
	if (!size) {
		return `Unknown machine type: ${machineType}`;
	}

	const { occupied } = ensurePlayerGrid(player);

	for (let x = 0; x < size.width; x++) {
		for (let z = 0; z < size.height; z++) {
			const cellX = coord.x + x;
			const cellZ = coord.z + z;

			if (cellX < 0 || cellX >= PLOT_SIZE || cellZ < 0 || cellZ >= PLOT_SIZE) {
				return "Out of bounds";
			}

			const key = `${cellX},${cellZ}`;
			if (occupied.has(key)) {
				return "Cell already occupied";
			}
		}
	}

	return undefined;
}

export function occupyCell(player: Player, coord: GridCoord, machineType: string): void {
	const size = MACHINE_SIZES[machineType];
	if (!size) {
		logger.warn(`Unknown machine type: ${machineType}`);
		return;
	}

	const { occupied, types } = ensurePlayerGrid(player);

	for (let x = 0; x < size.width; x++) {
		for (let z = 0; z < size.height; z++) {
			const cellX = coord.x + x;
			const cellZ = coord.z + z;
			const key = `${cellX},${cellZ}`;
			occupied.add(key);
			types.set(key, machineType);
		}
	}
}

/**
 * Scans the four faces of the machine footprint for an adjacent conveyor and returns
 * the corresponding DropSide. Falls back to "top" if none is found.
 *
 * Grid axes: +x = world right, +z = world back (+Z = LookVector opposite in Roblox).
 * So "front" = -Z world, "back" = +Z world.
 */
export function getAdjacentDropSide(player: Player, coord: GridCoord, machineType: string): DropSide {
	const size = MACHINE_SIZES[machineType];
	if (!size) return "top";

	const types = cellType.get(player);
	if (!types) return "top";

	const isConveyor = (x: number, z: number) => types.get(`${x},${z}`) === "Conveyor";

	for (let z = 0; z < size.height; z++) {
		if (isConveyor(coord.x + size.width, coord.z + z)) return "right";
	}
	for (let z = 0; z < size.height; z++) {
		if (isConveyor(coord.x - 1, coord.z + z)) return "left";
	}
	for (let x = 0; x < size.width; x++) {
		if (isConveyor(coord.x + x, coord.z + size.height)) return "back";
	}
	for (let x = 0; x < size.width; x++) {
		if (isConveyor(coord.x + x, coord.z - 1)) return "front";
	}

	return "top";
}
