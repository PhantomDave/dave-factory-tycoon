import { PlayerData } from "shared/types";

export class PlayerService {
	private playerData = new Map<Player, PlayerData>();

	addPlayer(player: Player): void {
		this.playerData.set(player, {
			playerId: player.UserId,
			coins: 0,
			multiplier: 1,
			unlockedUpgrades: [],
			lastChecked: os.time(),
		});
	}

	removePlayer(player: Player): void {
		const data = this.playerData.get(player);
		if (data) {
			this.playerData.delete(player);
		}
	}

	getPlayer(player: Player): PlayerData | undefined {
		return this.playerData.get(player);
	}

	addCoins(player: Player, amount: number): void {
		const data = this.getPlayer(player);
		if (data) {
			data.coins += amount;
		}
	}

	getBalance(player: Player): number {
		return this.getPlayer(player)?.coins ?? 0;
	}
}
