import React from "@rbxts/react";
import ReactRoblox from "@rbxts/react-roblox";
import { UPGRADES } from "shared/types";

export interface UpgradeShopProps {
	balance: number;
	onBuyUpgrade: (upgradeId: string) => void;
}

export const UpgradeShop: React.FC<UpgradeShopProps> = ({ balance, onBuyUpgrade }) => {
    const upgrades = new Array<(typeof UPGRADES)[keyof typeof UPGRADES]>();
    for (const [key, upgrade] of pairs(UPGRADES)) {
        upgrades.push(upgrade);
    }

	return (
		<scrollingframe
			Size={new UDim2(0, 300, 0, 400)}
			Position={new UDim2(0.65, 0, 0, 20)}
			BackgroundColor3={Color3.fromRGB(40, 40, 40)}
			BorderSizePixel={0}
			CanvasSize={new UDim2(0, 0, 0, upgrades.size() * 80)}
		>
			<uilistlayout
				Padding={new UDim(0, 5)}
				FillDirection={Enum.FillDirection.Vertical}
				HorizontalAlignment={Enum.HorizontalAlignment.Center}
				VerticalAlignment={Enum.VerticalAlignment.Top}
			/>
			{upgrades.map((upgrade, index) => {
				const canAfford = balance >= upgrade.cost;
				return (
					<frame
						key={upgrade.id}
						Size={new UDim2(1, -10, 0, 70)}
						BackgroundColor3={Color3.fromRGB(60, 60, 60)}
						BorderSizePixel={1}
					>
						<textlabel
							Size={new UDim2(1, 0, 0, 20)}
							BackgroundTransparency={1}
							TextColor3={Color3.fromRGB(255, 255, 255)}
							TextSize={14}
							Font={Enum.Font.GothamBold}
							Text={upgrade.displayName}
						/>
						<textbutton
							Size={new UDim2(1, 0, 0, 25)}
							Position={new UDim2(0, 0, 0, 45)}
							BackgroundColor3={canAfford ? Color3.fromRGB(0, 200, 100) : Color3.fromRGB(100, 100, 100)}
							Text={canAfford ? "Buy" : "Not Enough $"}
							Active={canAfford}
							Event={{
								Activated: () => onBuyUpgrade(upgrade.id),
							}}
						/>
					</frame>
				);
			})}
		</scrollingframe>
	);
};