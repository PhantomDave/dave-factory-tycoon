import { Players } from "@rbxts/services";
import {
	assignPlot,
	getNearestPlotPosition,
	getNearestPlotRotationDegrees,
	getPlayerPlot,
	getPlotPosition,
	releasePlot,
	spawnPlayerAtPlot,
} from "server/plot";
import { PlayerService } from "server/services/playerService";
import { logger } from "server/utils/logger";
import { clearPlayerGrid, gridCoordToWorld, initPlayerGrid, occupyCell } from "./grid";
import { deleteData, loadData, saveData } from "server/services/dataService";
import { registerMachine, serializeMachines, clearMachines } from "server/services/machineRegistry";
import { spawnMachine } from "server/factory";
import { getRemotes } from "shared/remotes";
import { worldToGridCoord } from "shared/gridMath";
import type { GridCoord, MachineData } from "shared/types";

export const playerService = new PlayerService();

let isInitialized = false;

function normalizeQuarterTurns(value: number): number {
	return ((math.round(value) % 4) + 4) % 4;
}

function getSavedRotationQuarterTurns(machine: MachineData, legacyPlotRotationDegrees = 0): number {
	if (machine.rotationQuarterTurns !== undefined) {
		return normalizeQuarterTurns(machine.rotationQuarterTurns);
	}

	if (machine.rotation !== undefined) {
		const worldRotationQuarterTurns = (math.deg(machine.rotation.RY) - legacyPlotRotationDegrees) / 90;
		return normalizeQuarterTurns(worldRotationQuarterTurns);
	}

	return 0;
}

function getSavedMachinePlacement(
	machine: MachineData,
	currentPlotCenter: Vector3,
): { coord: GridCoord; surfaceY: number; legacyPlotRotationDegrees: number } | undefined {
	if (machine.coord !== undefined) {
		return {
			coord: machine.coord,
			surfaceY: machine.surfaceY ?? currentPlotCenter.Y,
			legacyPlotRotationDegrees: 0,
		};
	}

	if (machine.position !== undefined) {
		const legacyPos = new Vector3(machine.position.X, machine.position.Y, machine.position.Z);
		const legacyPlotCenter = getNearestPlotPosition(legacyPos);
		const legacyPlotRotationDegrees = getNearestPlotRotationDegrees(legacyPos);
		return {
			coord: worldToGridCoord(legacyPos, legacyPlotCenter, machine.id, legacyPlotRotationDegrees),
			surfaceY: legacyPos.Y,
			legacyPlotRotationDegrees,
		};
	}

	return undefined;
}

function reconstructMachines(player: Player, machines: MachineData[]): void {
	if (machines.size() === 0) return;

	const plotFolder = getPlayerPlot(player);
	if (!plotFolder) {
		logger.warn(`No plot folder for ${player.Name}; skipping machine reconstruction`);
		return;
	}

	const plotCenter = getPlotPosition(player) ?? new Vector3(0, 0, 0);

	for (const machine of machines) {
		const savedPlacement = getSavedMachinePlacement(machine, plotCenter);
		if (!savedPlacement) {
			logger.warn(`Machine save for '${machine.id}' is missing placement data for ${player.Name}; skipping`);
			continue;
		}

		const rotationQuarterTurns = getSavedRotationQuarterTurns(machine, savedPlacement.legacyPlotRotationDegrees);
		const cf = gridCoordToWorld(
			player,
			savedPlacement.coord,
			machine.id,
			savedPlacement.surfaceY,
			rotationQuarterTurns,
		);

		const model = spawnMachine(machine.id, player, cf, plotFolder);
		if (model) {
			registerMachine(player, machine.id, model);
			occupyCell(player, savedPlacement.coord, machine.id);
		} else {
			logger.warn(`Unknown machine type '${machine.id}' for ${player.Name}; skipping`);
		}
	}

	logger.info(`Reconstructed ${machines.size()} machine(s) for ${player.Name}`);
}

function savePlayerData(player: Player): void {
	const data = playerService.getPlayer(player);
	if (!data) return;
	const machines = serializeMachines(player);
	saveData(player.UserId, data.coins, data.multiplier, data.unlockedUpgrades, machines);
	logger.info(`Saved ${player.Name}: ${data.coins} coins, ${machines.size()} machine(s)`);
}

function onPlayerAdded(player: Player) {
	try {
		const saved = loadData(player.UserId);
		playerService.addPlayer(player, saved);

		const plot = assignPlot(player);
		if (!plot) {
			logger.error(`No plots available for ${player.Name}`);
			player.Kick("Server is full — no plots available. Please try again later.");
			return;
		}

		initPlayerGrid(player);

		if (saved?.machines) {
			reconstructMachines(player, saved.machines);
		}

		player.CharacterAdded.Connect((character) => spawnPlayerAtPlot(player, character));

		// Handle case where the character already exists (e.g. Studio solo mode)
		const existingCharacter = player.Character;
		if (existingCharacter) {
			spawnPlayerAtPlot(player, existingCharacter);
		}

		logger.info(`${player.Name} joined with ${playerService.getBalance(player)} coins`);
	} catch (err) {
		logger.error(`Player join error for ${player.Name}: ${tostring(err)}`);
	}
}

function onPlayerRemoving(player: Player) {
	try {
		savePlayerData(player);
		clearMachines(player);
		playerService.removePlayer(player);
		clearPlayerGrid(player);
		releasePlot(player);
	} catch (err) {
		logger.error(`Player leaving error for ${player.Name}: ${tostring(err)}`);
	}
}

export function initializePlayerData(): void {
	if (isInitialized) {
		return;
	}

	isInitialized = true;
	Players.PlayerAdded.Connect(onPlayerAdded);
	Players.PlayerRemoving.Connect(onPlayerRemoving);

	// Save all remaining players on server shutdown before DataStores close.
	game.BindToClose(() => {
		for (const player of Players.GetPlayers()) {
			if (playerService.getPlayer(player)) {
				savePlayerData(player);
			}
		}
	});

	// In Studio solo mode the local player may already exist before this
	// script runs, so iterate existing players to catch them.
	for (const player of Players.GetPlayers()) {
		onPlayerAdded(player);
	}
}

export function getPlayerData(player: Player) {
	return playerService.getPlayer(player);
}

export function addCoins(player: Player, amount: number): void {
	playerService.addCoins(player, amount);
}

export function getBalance(player: Player): number {
	return playerService.getBalance(player);
}

export function wipePlayerData(player: Player): boolean {
	const data = playerService.getPlayer(player);
	if (!data) {
		return false;
	}

	const plotFolder = getPlayerPlot(player);
	if (plotFolder) {
		for (const child of plotFolder.GetChildren()) {
			child.Destroy();
		}
	}

	clearMachines(player);
	clearPlayerGrid(player);
	initPlayerGrid(player);

	data.coins = 0;
	data.multiplier = 1;
	data.unlockedUpgrades = [];
	data.machines = [];
	data.lastChecked = os.time();

	const wasDeleted = deleteData(player.UserId);
	const remotes = getRemotes();
	remotes.UpdateBalance.FireClient(player, data.coins);
	remotes.UpdateMultiplier.FireClient(player, data.multiplier);

	logger.warn(`${player.Name} wiped their saved data`);
	return wasDeleted;
}
