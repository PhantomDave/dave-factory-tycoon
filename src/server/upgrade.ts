import { Players } from "@rbxts/services";
import { UPGRADES } from "shared/types";
import { getPlayerData, addCoins } from "./data";
import { getRemotes } from "shared/remotes";

export function onBuyUpgrade(player: Player, upgradeId: string): boolean {
	const data = getPlayerData(player);
	const upgrade = UPGRADES[upgradeId];

	if (!data || !upgrade) {
		return false;
	}

	// Validate: has enough coins?
	if (data.coins < upgrade.cost) {
		print(`❌ ${player.Name} tried to buy but insufficient funds`);
		return false;
	}

	// Deduct coins & apply upgrade
	data.coins -= upgrade.cost;
	data.multiplier += upgrade.multiplier;
	data.unlockedUpgrades.push(upgradeId);

	print(`✅ ${player.Name} bought ${upgrade.displayName}`);

	// Notify client
	const remotes = getRemotes();
	remotes.UpdateBalance.FireClient(player, data.coins);

	return true;
}