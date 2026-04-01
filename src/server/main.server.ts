import { getRemotes } from "shared/remotes";
import { startMiningLoop } from "server/miner";
import { onBuyUpgrade } from "server/upgrade";
import { BaseConveyor } from "server/Models/Conveyors/BaseConveyor";
import { getPlayerSpawnPosition } from "server/Models/spawnUtils";
import { initializeSellZones } from "server/Models/SellZone";

print("🚀 Server starting...");

task.spawn(() => {
	// Initialize networking
	const remotes = getRemotes();
	print("✅ Remotes initialized");

	// Start passive income loop
	task.spawn(() => startMiningLoop());
	print("✅ Mining loop started");

	initializeSellZones();
	print("✅ Sell zones initialized");

	remotes.BuyUpgrade.OnServerEvent.Connect((player: Player, upgradeId: string) => {
		onBuyUpgrade(player, upgradeId);
	});

	remotes.SpawnConveyor.OnServerEvent.Connect((player: Player) => {
		const spawnPos = getPlayerSpawnPosition(player);

		const conveyor = new BaseConveyor();
		conveyor.spawn(spawnPos);
		print(`✅ ${player.Name} spawned a conveyor`);
	});
});