import { Players } from "@rbxts/services";
import { assignPlot, releasePlot, spawnPlayerAtPlot, getPlayerPlot, getPlotPosition } from "server/plot";
import { PlayerService } from "server/services/playerService";
import { logger } from "server/utils/logger";
import { clearPlayerGrid, initPlayerGrid, occupyCell } from "./grid";
import { loadData, saveData } from "server/services/dataService";
import { registerMachine, serializeMachines, clearMachines } from "server/services/machineRegistry";
import { spawnMachine } from "server/factory";
import { worldToGridCoord } from "shared/gridMath";
import type { MachineData } from "shared/types";

export const playerService = new PlayerService();

function reconstructMachines(player: Player, machines: MachineData[]): void {
	if (machines.size() === 0) return;

	const plotFolder = getPlayerPlot(player);
	if (!plotFolder) {
		logger.warn(`No plot folder for ${player.Name}; skipping machine reconstruction`);
		return;
	}

	const plotCenter = getPlotPosition(player) ?? new Vector3(0, 0, 0);

	for (const m of machines) {
		const pos = new Vector3(m.position.X, m.position.Y, m.position.Z);
		const rotCF = CFrame.fromEulerAnglesXYZ(m.rotation.RX, m.rotation.RY, m.rotation.RZ);
		const cf = new CFrame(pos).mul(rotCF);

		const model = spawnMachine(m.id, player, cf, plotFolder);
		if (model) {
			registerMachine(player, m.id, model);
			const coord = worldToGridCoord(pos, plotCenter, m.id);
			occupyCell(player, coord, m.id);
		} else {
			logger.warn(`Unknown machine type '${m.id}' for ${player.Name}; skipping`);
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

export function getPlayerData(player: Player) {
	return playerService.getPlayer(player);
}

export function addCoins(player: Player, amount: number): void {
	playerService.addCoins(player, amount);
}

export function getBalance(player: Player): number {
	return playerService.getBalance(player);
}
