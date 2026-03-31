import { getRemotes } from "shared/remotes";
import { startMiningLoop } from "server/miner";
import { onBuyUpgrade } from "server/upgrade";

print("🚀 Server starting...");

// Initialize networking
const remotes = getRemotes();
print("✅ Remotes initialized");

// Start passive income loop
task.spawn(() => startMiningLoop());
print("✅ Mining loop started");


// ...existing code...

remotes.BuyUpgrade.OnServerEvent.Connect((player: Player, upgradeId: string) => {
	onBuyUpgrade(player, upgradeId);
});