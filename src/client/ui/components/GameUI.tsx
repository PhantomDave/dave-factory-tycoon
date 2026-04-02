import React from "@rbxts/react";
import ReactRoblox from "@rbxts/react-roblox";
import { UpgradeShop } from "./UpgradeShop";

interface GameUIProps {
	balance: number;
	multiplier: number;
	shopOpen: boolean;
	onToggleShop: () => void;
	onBuyUpgrade: (upgradeId: string) => void;
	onStartPlacement: (machineType: string) => void;
}

export const GameUI: React.FC<GameUIProps> = ({
	balance,
	multiplier,
	shopOpen,
	onToggleShop,
	onBuyUpgrade,
	onStartPlacement,
}) => {
	return (
		<screengui ResetOnSpawn={false}>
			<textlabel
				Size={new UDim2(0, 250, 0, 60)}
				Position={new UDim2(0, 20, 0, 20)}
				BackgroundColor3={Color3.fromRGB(0, 120, 255)}
				TextColor3={Color3.fromRGB(255, 255, 255)}
				TextSize={28}
				Font={Enum.Font.GothamBold}
				Text={`💰 Coins: ${balance}`}
				BorderSizePixel={0}
			/>
            <textlabel
				Size={new UDim2(0, 250, 0, 60)}
				Position={new UDim2(0, 20, 0, 100)}
				BackgroundColor3={Color3.fromRGB(56, 153, 43)}
				TextColor3={Color3.fromRGB(255, 255, 255)}
				TextSize={28}
				Font={Enum.Font.GothamBold}
				Text={`💰 Multiplier: ${multiplier}`}
				BorderSizePixel={0}
			/>
			<textbutton
				Size={new UDim2(0, 250, 0, 50)}
				Position={new UDim2(0, 20, 0, 180)}
				BackgroundColor3={Color3.fromRGB(224, 166, 39)}
				TextColor3={Color3.fromRGB(18, 18, 18)}
				TextSize={22}
				Font={Enum.Font.GothamBold}
				Text={shopOpen ? "Close Upgrades" : "Open Upgrades"}
				Event={{
					Activated: onToggleShop,
				}}
			/>
			{shopOpen && <UpgradeShop balance={balance} onBuyUpgrade={onBuyUpgrade} onStartPlacement={onStartPlacement} />}
		</screengui>
	);
};