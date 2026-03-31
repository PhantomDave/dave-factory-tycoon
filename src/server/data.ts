import { Players } from "@rbxts/services";
import { PlayerData } from "shared/types";

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
	print(`✅ ${player.Name} joined with ${data.coins} coins`);
}

function onPlayerRemoving(player: Player) {
	const data = playerData.get(player);
	if (data) {
		print(`💾 Saving ${player.Name}: ${data.coins} coins`);
		playerData.delete(player);
	}
}

Players.PlayerAdded.Connect(onPlayerAdded);
Players.PlayerRemoving.Connect(onPlayerRemoving);

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