import { Players } from "@rbxts/services";
import { UPGRADES } from "shared/types";
import { getPlayerData, addCoins } from "./data";
import { getRemotes } from "shared/remotes";
import { BaseMiner } from "server/Models/Miners/BaseMiner";

export function onBuyUpgrade(player: Player, upgradeId: string): boolean {
	const data = getPlayerData(player);
	const upgrade = UPGRADES[upgradeId];

	if (!data || !upgrade) {
		return false;
	}

	// Validate: has enough coins?
	if (data.coins < upgrade.cost) {
		print(`❌ ${player.Name} tried to buy but insufficient funds`);
		return false;
	}

	// Deduct coins
	data.coins -= upgrade.cost;

	// Handle upgrade type
	if (upgrade.type === "multiplier" && upgrade.multiplier) {
		data.multiplier += upgrade.multiplier;
		data.unlockedUpgrades.push(upgradeId);
		print(`✅ ${player.Name} bought ${upgrade.displayName}`);
	} else if (upgrade.type === "spawner" && upgrade.spawnerType) {
		// Spawn the miner at player's character position
		const char = player.Character;
		const primaryPart = char?.PrimaryPart;
		const spawnPos = primaryPart ? primaryPart.Position : new Vector3(0, 0, 0);

		const miner = new BaseMiner(upgrade.spawnerTemplate);

		miner.spawn(spawnPos);

		data.unlockedUpgrades.push(upgradeId);
		print(`✅ ${player.Name} spawned ${upgrade.displayName}`);
	}

	// Notify client
	const remotes = getRemotes();
	remotes.UpdateBalance.FireClient(player, data.coins);

	return true;
}

