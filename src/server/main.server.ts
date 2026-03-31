import { getRemotes } from "shared/remotes";
import { startMiningLoop } from "server/miner";

print("🚀 Server starting...");

task.spawn(() => {
	// Initialize networking
	const remotes = getRemotes();
	print("✅ Remotes initialized");

	// Start passive income loop
	task.spawn(() => startMiningLoop());
	print("✅ Mining loop started");

	// Load upgrade handler after small delay to ensure WoodCube loads
	task.defer(() => {
		// Now safe to import upgrade which depends on BaseMiner
		const UpgradeModule = require("server/upgrade");
		const onBuyUpgrade = UpgradeModule.onBuyUpgrade as (player: Player, upgradeId: string) => boolean;

		remotes.BuyUpgrade.OnServerEvent.Connect((player: Player, upgradeId: string) => {
			onBuyUpgrade(player, upgradeId);
		});
	});
});