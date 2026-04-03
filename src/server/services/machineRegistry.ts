import type { MachineData } from "shared/types";

interface MachineEntry {
	machineType: string;
	model: Model;
}

const registry = new Map<Player, MachineEntry[]>();

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
	return entries
		.filter((e) => e.model.Parent !== undefined)
		.map((e) => {
			const cf = e.model.GetPivot();
			const pos = cf.Position;
			const [rx, ry, rz] = cf.ToEulerAnglesXYZ();
			return {
				id: e.machineType,
				position: { X: pos.X, Y: pos.Y, Z: pos.Z },
				rotation: { RX: rx, RY: ry, RZ: rz },
				state: "active",
			} as MachineData;
		});
}

export function clearMachines(player: Player): void {
	registry.delete(player);
}
