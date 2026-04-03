type SpawnFn = (player: Player, cframe: CFrame, plotFolder: Folder) => Model;

const spawners = new Map<string, SpawnFn>();

export function registerSpawner(machineType: string, fn: SpawnFn): void {
	spawners.set(machineType, fn);
}

export function spawnMachine(
	machineType: string,
	player: Player,
	cframe: CFrame,
	plotFolder: Folder,
): Model | undefined {
	const fn = spawners.get(machineType);
	return fn ? fn(player, cframe, plotFolder) : undefined;
}
