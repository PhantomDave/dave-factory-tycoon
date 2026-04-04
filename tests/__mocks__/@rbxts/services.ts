/** Minimal stub for @rbxts/services – prevents Roblox runtime errors in Node.js. */

export const ReplicatedStorage = {
	FindFirstChild: (_name: string) => undefined,
	GetChildren: () => [],
	Name: "ReplicatedStorage",
};

export const Players = {
	GetPlayers: () => [],
	GetPlayerByUserId: (_id: number) => undefined,
	PlayerAdded: { Connect: (_fn: unknown) => {} },
	PlayerRemoving: { Connect: (_fn: unknown) => {} },
};

export const Workspace = {
	GetChildren: () => [],
	GetDescendants: () => [],
	DescendantAdded: { Connect: (_fn: unknown) => {} },
	DescendantRemoving: { Connect: (_fn: unknown) => {} },
};

export const RunService = {
	IsStudio: () => false,
};

export const UserInputService = {
	InputBegan: { Connect: (_fn: unknown) => {} },
};

