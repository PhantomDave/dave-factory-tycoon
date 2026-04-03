import { UPGRADES, MACHINE_SIZES } from "shared/types";
import { addCoins, getPlayerData } from "server/data";
import { getRemotes } from "shared/remotes";
import { findFreeGridCoord } from "server/grid";
import { performPlacement } from "server/requests/placement";
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
		if (!MACHINE_SIZES[upgrade.spawnerTemplate]) {
			logger.warn(`${player.Name} spawner upgrade references unknown machine type: ${upgrade.spawnerTemplate}`);
			return false;
		}

		const freeCoord = findFreeGridCoord(player, upgrade.spawnerTemplate);
		if (freeCoord === undefined) {
			logger.warn(`${player.Name} has no free grid space for ${upgrade.displayName}`);
			return false;
		}

		const placementError = performPlacement(player, upgrade.spawnerTemplate, freeCoord);
		if (placementError !== undefined) {
			logger.warn(`${player.Name} placement via upgrade failed for ${upgrade.displayName}: ${placementError}`);
			return false;
		}

		data.unlockedUpgrades.push(upgradeId);
		logger.info(`${player.Name} spawned ${upgrade.displayName}`);
	}

	// Deduct coins (after all validation)
	addCoins(player, -upgrade.cost);

	return true;
}
