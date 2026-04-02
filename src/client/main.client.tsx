import { Players } from "@rbxts/services";
import { getRemotes } from "shared/remotes";
import React, { StrictMode, useState } from "@rbxts/react";
import { createPortal, createRoot } from "@rbxts/react-roblox";
import { GameUI } from "./ui/components/GameUI";
import { placementController } from "./placementController";

const player = Players.LocalPlayer;
const playerGui = player.WaitForChild("PlayerGui") as PlayerGui;
const remotes = getRemotes();

function GameUIWrapper() {
	const [balance, setBalance] = useState(0);
	const [multiplier, setMultiplier] = useState(1);
	const [shopOpen, setShopOpen] = useState(false);

	// Listen for balance updates from server
	remotes.UpdateBalance.OnClientEvent.Connect((newBalance: number) => {
		setBalance(newBalance);
	});

	// Listen for multiplier updates from server
	remotes.UpdateMultiplier.OnClientEvent.Connect((newMultiplier: number) => {
		setMultiplier(newMultiplier);
	});

	const handleToggleShop = () => {
		setShopOpen((prev) => !prev);
	};

	const handleBuyUpgrade = (upgradeId: string) => {
		remotes.BuyUpgrade.FireServer(upgradeId);
	};

	const handleStartPlacement = (machineType: string) => {
		placementController.beginPlacing(machineType);
	};

	return (
		<GameUI
			balance={balance}
			multiplier={multiplier}
			shopOpen={shopOpen}
			onToggleShop={handleToggleShop}
			onBuyUpgrade={handleBuyUpgrade}
			onStartPlacement={handleStartPlacement}
		/>
	);
}

const root = createRoot(new Instance("ScreenGui"));

root.render(
	<StrictMode>{createPortal(<GameUIWrapper />, playerGui)}</StrictMode>
);

print("✅ Client UI mounted with event listeners");
