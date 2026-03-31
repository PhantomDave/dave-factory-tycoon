import { Players, UserInputService } from "@rbxts/services";

const player = Players.LocalPlayer;
const playerGui = player.WaitForChild("PlayerGui") as PlayerGui;

// Create ScreenGui
const screenGui = new Instance("ScreenGui");
screenGui.Name = "GameUI";
screenGui.ResetOnSpawn = false;
screenGui.Parent = playerGui;

// Balance Label
const balanceLabel = new Instance("TextLabel");
balanceLabel.Name = "BalanceLabel";
balanceLabel.Size = new UDim2(0, 200, 0, 50);
balanceLabel.Position = new UDim2(0, 10, 0, 10);
balanceLabel.BackgroundColor3 = Color3.fromRGB(0, 100, 255);
balanceLabel.TextColor3 = Color3.fromRGB(255, 255, 255);
balanceLabel.TextSize = 24;
balanceLabel.Font = Enum.Font.GothamBold;
balanceLabel.Text = "Coins: 0";
balanceLabel.Parent = screenGui;

// Buy Button
const buyButton = new Instance("TextButton");
buyButton.Name = "BuyButton";
buyButton.Size = new UDim2(0, 150, 0, 50);
buyButton.Position = new UDim2(0, 10, 0, 70);
buyButton.BackgroundColor3 = Color3.fromRGB(0, 200, 100);
buyButton.TextColor3 = Color3.fromRGB(255, 255, 255);
buyButton.TextSize = 20;
buyButton.Font = Enum.Font.GothamBold;
buyButton.Text = "Buy (+10)";
buyButton.Parent = screenGui;

export { screenGui, balanceLabel, buyButton };