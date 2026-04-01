import { Players } from "@rbxts/services";
import { getPlotPosition } from "server/plot";
import { GridCoord, GRID_CELL_SIZE, GRID_COLS, GRID_ROWS } from "shared/types";
import { logger } from "./utils/logger";

const occupancy = new Map<Player, Set<string>>();

export function initPlayerGrid(player: Player): void {
  occupancy.set(player, new Set());
}

export function clearPlayerGrid(player: Player): void {
  occupancy.delete(player);
}

export function gridCoordToWorld(player: Player, coord: GridCoord): CFrame {
  const origin = getPlotPosition(player) ?? new Vector3(0, 0, 0);    

  const worldX = origin.X + coord.x * GRID_CELL_SIZE + GRID_CELL_SIZE / 2;
  const worldZ = origin.Z + coord.z * GRID_CELL_SIZE + GRID_CELL_SIZE / 2;
  return new CFrame(worldX, origin.Y, worldZ);
}

export function validatePlacement(player: Player, coord: GridCoord): string | undefined {
  if (coord.x < 0 || coord.x >= GRID_COLS || coord.z < 0 || coord.z >= GRID_ROWS) {
    return "Out of bounds";
  }
  const key = `${coord.x},${coord.z}`;
  if (occupancy.get(player)?.has(key)) {
    return "Cell already occupied";
  }
  return undefined;
}

// Mark a cell as occupied.  Must be called only after a successful placement.
export function occupyCell(player: Player, coord: GridCoord): void {
  const key = `${coord.x},${coord.z}`;
  occupancy.get(player)?.add(key);
}