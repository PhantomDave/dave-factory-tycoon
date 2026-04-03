import { getPlotPosition, getPlotRotationDegrees } from "server/plot";
import { worldToGridCoord } from "shared/gridMath";
import type { MachineData } from "shared/types";

interface MachineEntry {
	machineType: string;
	model: Model;
}

const registry = new Map<Player, MachineEntry[]>();

function normalizeDegrees(value: number): number {
	return ((value % 360) + 360) % 360;
}

function normalizeQuarterTurns(value: number): number {
	return ((math.round(value) % 4) + 4) % 4;
}

export function registerMachine(player: Player, machineType: string, model: Model): void {
	let entries = registry.get(player);
	if (!entries) {
		entries = [];
		registry.set(player, entries);
	}
	entries.push({ machineType, model });
}

export function serializeMachines(player: Player): MachineData[] {
	const entries = registry.get(player);
	if (!entries) return [];

	const plotCenter = getPlotPosition(player) ?? new Vector3(0, 0, 0);
	const plotRotationDegrees = getPlotRotationDegrees(player);

	return entries
		.filter((e) => e.model.Parent !== undefined)
		.map((e) => {
			const cf = e.model.GetPivot();
			const pos = cf.Position;
			const [_rx, ry] = cf.ToEulerAnglesXYZ();
			const coord = worldToGridCoord(pos, plotCenter, e.machineType, plotRotationDegrees);
			const worldRotationDegrees = normalizeDegrees(math.deg(ry));
			const relativeRotationDegrees = normalizeDegrees(worldRotationDegrees - plotRotationDegrees);
			const rotationQuarterTurns = normalizeQuarterTurns(relativeRotationDegrees / 90);

			return {
				id: e.machineType,
				coord,
				surfaceY: pos.Y,
				rotationQuarterTurns,
				state: "active",
			};
		});
}

export function clearMachines(player: Player): void {
	registry.delete(player);
}
