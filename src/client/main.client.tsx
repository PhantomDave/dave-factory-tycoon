import { Players } from "@rbxts/services";
import { getRemotes } from "shared/remotes";
import React, { StrictMode, useEffect, useState } from "@rbxts/react";
import { createPortal, createRoot } from "@rbxts/react-roblox";
import { initializeItemMovementController } from "./itemMovementController";
import { GameUI } from "./ui/components/GameUI";
import { placementController } from "./placementController";

const player = Players.LocalPlayer;
const playerGui = player.WaitForChild("PlayerGui") as PlayerGui;
const remotes = getRemotes();

initializeItemMovementController();

function getInitialBalance(): number {
	const leaderstats = player.FindFirstChild("leaderstats");
	if (!leaderstats || !leaderstats.IsA("Folder")) {
		return 0;
	}

	const cashValue = leaderstats.FindFirstChild("Cash");
	if (!cashValue || !cashValue.IsA("IntValue")) {
		return 0;
	}

	return cashValue.Value;
}

function GameUIWrapper() {
	const [balance, setBalance] = useState(getInitialBalance());
	const [shopOpen, setShopOpen] = useState(false);

	useEffect(() => {
		const balanceConnection = remotes.UpdateBalance.OnClientEvent.Connect((newBalance: number) => {
			setBalance(newBalance);
		});

		task.spawn(() => {
			const leaderstats = player.WaitForChild("leaderstats") as Folder;
			const cashValue = leaderstats.WaitForChild("Cash") as IntValue;
			setBalance(cashValue.Value);
		});

		return () => {
			balanceConnection.Disconnect();
		};
	}, []);

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
