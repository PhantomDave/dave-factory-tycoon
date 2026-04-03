import { getRemotes } from "shared/remotes";
import { MachineData, PlayerData } from "shared/types";

interface SavedPlayerData {
	coins: number;
	multiplier: number;
	unlockedUpgrades: string[];
	machines: MachineData[];
}

const remotes = getRemotes();
const LEADERSTATS_NAME = "leaderstats";
const CASH_STAT_NAME = "Cash";

function ensureLeaderstats(player: Player): Folder {
	const existing = player.FindFirstChild(LEADERSTATS_NAME);
	if (existing && existing.IsA("Folder")) {
		return existing;
	}

	existing?.Destroy();

	const leaderstats = new Instance("Folder");
	leaderstats.Name = LEADERSTATS_NAME;
	leaderstats.Parent = player;
	return leaderstats;
}

function ensureCashStat(player: Player): IntValue {
	const leaderstats = ensureLeaderstats(player);
	const existing = leaderstats.FindFirstChild(CASH_STAT_NAME);
	if (existing && existing.IsA("IntValue")) {
		return existing;
	}

	existing?.Destroy();

	const cashStat = new Instance("IntValue");
	cashStat.Name = CASH_STAT_NAME;
	cashStat.Parent = leaderstats;
	return cashStat;
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

		this.syncBalance(player);
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

	addCoins(player: Player, amount: number): number {
		const data = this.getPlayer(player);
		if (!data) {
			return 0;
		}

		data.coins += amount;
		this.syncBalance(player);
		return data.coins;
	}

	setCoins(player: Player, amount: number): number {
		const data = this.getPlayer(player);
		if (!data) {
			return 0;
		}

		data.coins = amount;
		this.syncBalance(player);
		return data.coins;
	}

	syncBalance(player: Player): void {
		const data = this.getPlayer(player);
		if (!data) {
			return;
		}

		const cashStat = ensureCashStat(player);
		cashStat.Value = math.max(0, math.round(data.coins));
		remotes.UpdateBalance.FireClient(player, data.coins);
	}

	getBalance(player: Player): number {
		return this.getPlayer(player)?.coins ?? 0;
	}
}
