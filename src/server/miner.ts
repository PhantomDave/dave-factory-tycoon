import { Players } from "@rbxts/services";
import { addCoins, getBalance, getPlayerData } from "./data";
import { getRemotes } from "shared/remotes";

export function startMiningLoop(): void {
		const remotes = getRemotes();
	while (true) {
		task.wait(1); // Tick once per second

		const players = Players.GetPlayers();
		for (const player of players) {
			addCoins(player, 1);
			const data = getPlayerData(player);
			if (data) {
				print(`💰 ${player.Name}: ${data.coins} coins`);
				remotes.UpdateBalance.FireClient(player, data.coins);
			}
		}
	}
}