/** Minimal stub for @rbxts/services – prevents Roblox runtime errors in Node.js. */

export const ReplicatedStorage = {
	FindFirstChild: (_name: string) => undefined,
	GetChildren: () => [],
	Name: "ReplicatedStorage",
};

export const Players = {
	GetPlayers: () => [],
	PlayerAdded: { Connect: (_fn: unknown) => {} },
	PlayerRemoving: { Connect: (_fn: unknown) => {} },
};

export const Workspace = {
	GetChildren: () => [],
};
