import { Players } from "@rbxts/services";
import { PlayerData } from "shared/types";
import { assignPlot, releasePlot, spawnPlayerAtPlot } from "server/plot";

const playerData = new Map<Player, PlayerData>();

function onPlayerAdded(player: Player) {
	const data: PlayerData = {
		playerId: player.UserId,
		coins: 0,
		multiplier: 1,
		unlockedUpgrades: [],
		lastChecked: os.time(),
	};
	playerData.set(player, data);

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

	print(`✅ ${player.Name} joined with ${data.coins} coins`);
}

function onPlayerRemoving(player: Player) {
	const data = playerData.get(player);
	if (data) {
		print(`💾 Saving ${player.Name}: ${data.coins} coins`);
		playerData.delete(player);
	}
	releasePlot(player);
}

Players.PlayerAdded.Connect(onPlayerAdded);
Players.PlayerRemoving.Connect(onPlayerRemoving);

// In Studio solo mode the local player may already exist before this
// script runs, so iterate existing players to catch them.
for (const player of Players.GetPlayers()) {
	onPlayerAdded(player);
}

export function getPlayerData(player: Player): PlayerData | undefined {
	return playerData.get(player);
}

export function addCoins(player: Player, amount: number): void {
	const data = getPlayerData(player);
	if (data) {
		data.coins += amount;
	}
}

export function getBalance(player: Player): number {
	const data = getPlayerData(player);
	return data ? data.coins : 0;
}