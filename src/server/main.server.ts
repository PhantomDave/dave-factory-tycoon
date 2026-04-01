import { getRemotes } from "shared/remotes";
import { startMiningLoop } from "server/miner";
import { onBuyUpgrade } from "server/upgrade";
import { BaseConveyor } from "server/models/conveyors/baseConveyor";
import { getPlayerSpawnPosition } from "server/models/spawnUtils";
import { initializeSellZones } from "server/models/sellZone";
import { logger } from "server/utils/logger";

logger.info("Server starting...");

task.spawn(() => {
	// Initialize networking
	const remotes = getRemotes();
	logger.info("Remotes initialized");

	// Start passive income loop
	task.spawn(() => startMiningLoop());
	logger.info("Mining loop started");

	initializeSellZones();
	logger.info("Sell zones initialized");

	remotes.BuyUpgrade.OnServerEvent.Connect((player: Player, upgradeId: string) => {
		try {
			if (typeIs(upgradeId, "string") && upgradeId.size() > 0) {
				onBuyUpgrade(player, upgradeId);
			} else {
				logger.warn(`${player.Name} sent invalid upgradeId`);
			}
		} catch (err) {
			logger.error(`BuyUpgrade error for ${player.Name}: ${tostring(err)}`);
		}
	});

	remotes.SpawnConveyor.OnServerEvent.Connect((player: Player) => {
		try {
			const spawnPos = getPlayerSpawnPosition(player);

			const conveyor = new BaseConveyor();
			conveyor.spawn(spawnPos);
			logger.info(`${player.Name} spawned a conveyor`);
		} catch (err) {
			logger.error(`SpawnConveyor error for ${player.Name}: ${tostring(err)}`);
		}
	});
});