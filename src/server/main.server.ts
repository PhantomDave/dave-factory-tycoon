import { getRemotes } from "shared/remotes";
import { startMiningLoop } from "server/miner";
import { onBuyUpgrade } from "server/upgrade";
import { BaseConveyor } from "server/Models/Conveyors/BaseConveyor";

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

	remotes.SpawnConveyor.OnServerEvent.Connect((player: Player) => {
		const char = player.Character;
		const primaryPart = char?.PrimaryPart;
		const spawnPos = primaryPart ? primaryPart.Position : new Vector3(0, 0, 0);

		const conveyor = new BaseConveyor();
		conveyor.spawn(spawnPos);
		print(`✅ ${player.Name} spawned a conveyor`);
	});
});