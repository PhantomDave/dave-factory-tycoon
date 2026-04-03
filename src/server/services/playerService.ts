import { MachineData, PlayerData } from "shared/types";

interface SavedPlayerData {
	coins: number;
	multiplier: number;
	unlockedUpgrades: string[];
	machines: MachineData[];
}

export class PlayerService {
	private playerData = new Map<Player, PlayerData>();

	addPlayer(player: Player, saved?: Partial<SavedPlayerData>): void {
		this.playerData.set(player, {
			playerId: player.UserId,
			coins: saved?.coins ?? 0,
			multiplier: saved?.multiplier ?? 1,
			unlockedUpgrades: saved?.unlockedUpgrades ?? [],
			lastChecked: os.time(),
			machines: saved?.machines ?? [],
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
