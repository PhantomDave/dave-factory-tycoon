import { Players } from "@rbxts/services";
import { addCoins, getBalance, getPlayerData } from "./data";

export function startMiningLoop(): void {
	while (true) {
		task.wait(1); // Tick once per second

		const players = Players.GetPlayers();
		for (const player of players) {
			addCoins(player, 1);
			const data = getPlayerData(player);
			if (data) {
				print(`💰 ${player.Name}: ${data.coins} coins`);
			}
		}
	}
}