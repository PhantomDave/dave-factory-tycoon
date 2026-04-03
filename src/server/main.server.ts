import { Players } from "@rbxts/services";
import { wipePlayerData } from "server/data";
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

const WIPE_DATA_COMMANDS = new Set(["/wipe", "!wipe", "/resetdata", "!resetdata"]);

logger.info("Server starting...");

Players.PlayerAdded.Connect((player) => {
	player.Chatted.Connect((message) => {
		const command = message.lower().split(" ")[0];
		if (!WIPE_DATA_COMMANDS.has(command)) {
			return;
		}

		try {
			const didDelete = wipePlayerData(player);
			if (!didDelete) {
				logger.warn(`Wipe data command failed for ${player.Name}`);
				return;
			}

			player.Kick("Your saved data was wiped. Rejoin for a fresh start.");
		} catch (err) {
			logger.error(`Wipe data command failed for ${player.Name}: ${tostring(err)}`);
		}
	});
});

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
