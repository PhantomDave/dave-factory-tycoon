import { getRemotes } from "shared/remotes";
import { startMiningLoop } from "server/miner";
import { onBuyUpgrade } from "server/upgrade";

print("🚀 Server starting...");

task.spawn(() => {
	// Initialize networking
	const remotes = getRemotes();
	print("✅ Remotes initialized");

	// Start passive income loop
	task.spawn(() => startMiningLoop());
	print("✅ Mining loop started");

	remotes.BuyUpgrade.OnServerEvent.Connect((player: Player, upgradeId: string) => {
		onBuyUpgrade(player, upgradeId);
	});
});