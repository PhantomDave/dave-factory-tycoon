import { UPGRADES } from "shared/types";
import { addCoins, getPlayerData } from "server/data";
import { getRemotes } from "shared/remotes";
import { BaseMiner } from "server/models/miners/baseMiner";
import { getPlayerSpawnPosition, spawnTemplateModel } from "server/models/spawnUtils";
import { logger } from "server/utils/logger";

export function onBuyUpgrade(player: Player, upgradeId: string): boolean {
	const data = getPlayerData(player);
	const upgrade = UPGRADES[upgradeId];

	if (!data || !upgrade) {
		return false;
	}

	// Prevent duplicate purchases
	if (data.unlockedUpgrades.includes(upgradeId)) {
		logger.warn(`${player.Name} already owns ${upgrade.displayName}`);
		return false;
	}

	// Validate: has enough coins?
	if (data.coins < upgrade.cost) {
		logger.warn(`${player.Name} tried to buy but insufficient funds`);
		return false;
	}

	const remotes = getRemotes();

	// Handle upgrade type
	if (upgrade.type === "multiplier") {
		data.multiplier += upgrade.multiplier;
		data.unlockedUpgrades.push(upgradeId);
		logger.info(`${player.Name} bought ${upgrade.displayName}`);
		remotes.UpdateMultiplier.FireClient(player, data.multiplier);
	} else if (upgrade.type === "spawner") {
		// Note: Spawner upgrades should use the placement system instead
		// This is a temporary fix for backwards compatibility
		const spawnPos = getPlayerSpawnPosition(player);
		const spawnCFrame = new CFrame(spawnPos);

		if (upgrade.spawnerTemplate === "BaseMiner") {
			const miner = new BaseMiner(upgrade.spawnerTemplate, player.UserId);
			miner.spawn(spawnCFrame, game.Workspace);
		} else {
			spawnTemplateModel(upgrade.spawnerTemplate, spawnCFrame);
		}

		data.unlockedUpgrades.push(upgradeId);
		logger.info(`${player.Name} spawned ${upgrade.displayName}`);
	}

	// Deduct coins (after all validation)
	addCoins(player, -upgrade.cost);

	return true;
}
