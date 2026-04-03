import { initializeSellZones } from "server/models/sellZone";
import { onBuyUpgrade } from "server/upgrade";
import { logger } from "server/utils/logger";
import { getRemotes } from "shared/remotes";
import { initPlacementHandler } from "./requests/placement";

// Side-effect imports: each module calls registerSpawner() at load time.
// Add a new import here whenever a new placeable machine module is created.
import "server/models/miners/baseMiner";
import "server/models/conveyors/baseConveyor";
// server/models/sellZone is already imported above via initializeSellZones

logger.info("Server starting...");

task.spawn(() => {
	const remotes = getRemotes();
	logger.info("Remotes initialized");

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

	initPlacementHandler();
});
