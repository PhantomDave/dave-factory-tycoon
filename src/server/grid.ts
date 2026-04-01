import { Players } from "@rbxts/services";
import { getPlotPosition } from "server/plot";
import { GridCoord, GRID_CELL_SIZE, PLOT_SIZE, MACHINE_SIZES, DropSide } from "shared/types";
import { logger } from "./utils/logger";

const occupancy    = new Map<Player, Set<string>>();
const cellType     = new Map<Player, Map<string, string>>();

export function initPlayerGrid(player: Player): void {
  occupancy.set(player, new Set());
  cellType.set(player, new Map());
}

export function clearPlayerGrid(player: Player): void {
  occupancy.delete(player);
  cellType.delete(player);
}

export function gridCoordToWorld(player: Player, coord: GridCoord, machineType: string, surfaceY?: number): CFrame {
  const origin = getPlotPosition(player) ?? new Vector3(0, 0, 0);
  const size = MACHINE_SIZES[machineType] || { width: 1, height: 1 };

  // Center the pivot on the full footprint (not just the top-left cell).
  const worldX = origin.X + coord.x * GRID_CELL_SIZE + size.width  * GRID_CELL_SIZE / 2;
  const worldZ = origin.Z + coord.z * GRID_CELL_SIZE + size.height * GRID_CELL_SIZE / 2;
  // Use the client's raycast surface Y when available; otherwise fall back to the stored origin Y.
  const worldY = surfaceY ?? origin.Y;
  const worldCFrame = new CFrame(worldX, worldY, worldZ);

  logger.info(`Player: ${player.Name}, Grid: (${coord.x}, ${coord.z}) -> World: (${worldX}, ${worldY}, ${worldZ})`);
  logger.info(`Plot Origin: (${origin.X}, ${origin.Y}, ${origin.Z})`);

  return worldCFrame;
}

export function validatePlacement(player: Player, coord: GridCoord, machineType: string): string | undefined {
  const size = MACHINE_SIZES[machineType];
  if (!size) {
    return `Unknown machine type: ${machineType}`;
  }

  // Check all cells the machine would occupy
  for (let x = 0; x < size.width; x++) {
    for (let z = 0; z < size.height; z++) {
      const cellX = coord.x + x;
      const cellZ = coord.z + z;

      // Check bounds
      if (cellX < 0 || cellX >= PLOT_SIZE || cellZ < 0 || cellZ >= PLOT_SIZE) {
        return "Out of bounds";
      }

      // Check occupancy
      const key = `${cellX},${cellZ}`;
      if (occupancy.get(player)?.has(key)) {
        return "Cell already occupied";
      }
    }
  }

  return undefined;
}

// Mark all cells a machine occupies. Must be called only after a successful placement.
export function occupyCell(player: Player, coord: GridCoord, machineType: string): void {
  const size = MACHINE_SIZES[machineType];
  if (!size) {
    logger.warn(`Unknown machine type: ${machineType}`);
    return;
  }

  // Occupy all cells the machine uses
  for (let x = 0; x < size.width; x++) {
    for (let z = 0; z < size.height; z++) {
      const cellX = coord.x + x;
      const cellZ = coord.z + z;
      const key = `${cellX},${cellZ}`;
      occupancy.get(player)?.add(key);
      cellType.get(player)?.set(key, machineType);
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

  // Right face (+X): column coord.x + size.width
  for (let z = 0; z < size.height; z++) {
    if (isConveyor(coord.x + size.width, coord.z + z)) return "right";
  }
  // Left face (-X): column coord.x - 1
  for (let z = 0; z < size.height; z++) {
    if (isConveyor(coord.x - 1, coord.z + z)) return "left";
  }
  // Back face (+Z): row coord.z + size.height
  for (let x = 0; x < size.width; x++) {
    if (isConveyor(coord.x + x, coord.z + size.height)) return "back";
  }
  // Front face (-Z): row coord.z - 1
  for (let x = 0; x < size.width; x++) {
    if (isConveyor(coord.x + x, coord.z - 1)) return "front";
  }

  return "top";
}
