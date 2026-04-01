import { UPGRADES } from "shared/types";
import { getPlayerData } from "server/data";
import { getRemotes } from "shared/remotes";
import { BaseMiner } from "server/models/miners/baseMiner";
import { getPlayerSpawnPosition, spawnTemplateModel } from "server/models/spawnUtils";

export function onBuyUpgrade(player: Player, upgradeId: string): boolean {
	const data = getPlayerData(player);
	const upgrade = UPGRADES[upgradeId];

	if (!data || !upgrade) {
		return false;
	}

	// Prevent duplicate purchases
	if (data.unlockedUpgrades.includes(upgradeId)) {
		print(`❌ ${player.Name} already owns ${upgrade.displayName}`);
		return false;
	}

	// Validate: has enough coins?
	if (data.coins < upgrade.cost) {
		print(`❌ ${player.Name} tried to buy but insufficient funds`);
		return false;
	}

	const remotes = getRemotes();

	// Handle upgrade type
	if (upgrade.type === "multiplier") {
		data.multiplier += upgrade.multiplier;
		data.unlockedUpgrades.push(upgradeId);
		print(`✅ ${player.Name} bought ${upgrade.displayName}`);
		remotes.UpdateMultiplier.FireClient(player, data.multiplier);
	} else if (upgrade.type === "spawner") {
		const spawnPos = getPlayerSpawnPosition(player);
		if (upgrade.spawnerTemplate === "BaseMiner") {
			const miner = new BaseMiner(upgrade.spawnerTemplate, player.UserId);
			miner.spawn(spawnPos);
		} else {
			spawnTemplateModel(upgrade.spawnerTemplate, spawnPos);
		}

		data.unlockedUpgrades.push(upgradeId);
		print(`✅ ${player.Name} spawned ${upgrade.displayName}`);
	}

	// Deduct coins (after all validation)
	data.coins -= upgrade.cost;
	// Notify client of balance change
	remotes.UpdateBalance.FireClient(player, data.coins);

	return true;
}

