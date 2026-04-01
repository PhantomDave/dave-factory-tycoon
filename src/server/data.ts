import { Players } from "@rbxts/services";
import { assignPlot, releasePlot, spawnPlayerAtPlot } from "server/plot";
import { PlayerService } from "server/services/playerService";
import { logger } from "server/utils/logger";

export const playerService = new PlayerService();

function onPlayerAdded(player: Player) {
	playerService.addPlayer(player);

	const plot = assignPlot(player);
	if (!plot) {
		player.Kick("Server is full — no plots available. Please try again later.");
		return;
	}

	player.CharacterAdded.Connect((character) => spawnPlayerAtPlot(player, character));

	// Handle case where the character already exists (e.g. Studio solo mode)
	const existingCharacter = player.Character;
	if (existingCharacter) {
		spawnPlayerAtPlot(player, existingCharacter);
	}

	logger.info(`${player.Name} joined with ${playerService.getBalance(player)} coins`);
}

function onPlayerRemoving(player: Player) {
	const data = playerService.getPlayer(player);
	if (data) {
		logger.info(`Saving ${player.Name}: ${data.coins} coins`);
	}
	playerService.removePlayer(player);
	releasePlot(player);
}

Players.PlayerAdded.Connect(onPlayerAdded);
Players.PlayerRemoving.Connect(onPlayerRemoving);

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
