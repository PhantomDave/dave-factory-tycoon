import { getPlotPosition, getPlotRotationDegrees } from "server/plot";
import { worldToGridCoord } from "shared/gridMath";
import type { MachineData } from "shared/types";

interface MachineEntry {
	machineType: string;
	model: Model;
	rotationQuarterTurns?: number;
}

const registry = new Map<Player, MachineEntry[]>();

function normalizeDegrees(value: number): number {
	return ((value % 360) + 360) % 360;
}

function normalizeQuarterTurns(value: number): number {
	return ((math.round(value) % 4) + 4) % 4;
}

function getModelSurfaceY(model: Model): number {
	const [boundingBoxCFrame, boundingBoxSize] = model.GetBoundingBox();
	return boundingBoxCFrame.Position.Y - boundingBoxSize.Y / 2;
}

function getModelRotationQuarterTurns(model: Model, plotRotationDegrees: number): number {
	const storedRotation = model.GetAttribute("RotationQuarterTurns");
	if (typeIs(storedRotation, "number")) {
		return normalizeQuarterTurns(storedRotation);
	}

	const [, yawRadians] = model.GetPivot().ToOrientation();
	const worldRotationDegrees = normalizeDegrees(math.deg(yawRadians));
	const relativeRotationDegrees = normalizeDegrees(worldRotationDegrees - plotRotationDegrees);
	return normalizeQuarterTurns(relativeRotationDegrees / 90);
}

export function registerMachine(
	player: Player,
	machineType: string,
	model: Model,
	rotationQuarterTurns?: number,
): void {
	let entries = registry.get(player);
	if (!entries) {
		entries = [];
		registry.set(player, entries);
	}

	const normalizedRotationQuarterTurns =
		rotationQuarterTurns !== undefined ? normalizeQuarterTurns(rotationQuarterTurns) : undefined;
	if (normalizedRotationQuarterTurns !== undefined) {
		model.SetAttribute("RotationQuarterTurns", normalizedRotationQuarterTurns);
	}

	entries.push({ machineType, model, rotationQuarterTurns: normalizedRotationQuarterTurns });
}

export function serializeMachines(player: Player): MachineData[] {
	const entries = registry.get(player);
	if (!entries) return [];

	const liveEntries = entries.filter((entry) => entry.model.Parent !== undefined);
	if (liveEntries.size() === 0) {
		registry.delete(player);
		return [];
	}

	if (liveEntries.size() !== entries.size()) {
		registry.set(player, liveEntries);
	}

	const plotCenter = getPlotPosition(player) ?? new Vector3(0, 0, 0);
	const plotRotationDegrees = getPlotRotationDegrees(player);

	return liveEntries.map((entry) => {
		const cf = entry.model.GetPivot();
		const pos = cf.Position;
		const coord = worldToGridCoord(pos, plotCenter, entry.machineType, plotRotationDegrees);
		const rotationQuarterTurns =
			entry.rotationQuarterTurns ?? getModelRotationQuarterTurns(entry.model, plotRotationDegrees);

		return {
			id: entry.machineType,
			coord,
			surfaceY: getModelSurfaceY(entry.model),
			rotationQuarterTurns,
			state: "active",
		};
	});
}

export function clearMachines(player: Player): void {
	registry.delete(player);
}
