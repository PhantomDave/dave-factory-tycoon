import { ReplicatedStorage } from "@rbxts/services";

type TypedRemoteEvent<TArgs extends defined[] = []> = RemoteEvent & {
	FireServer: (...args: TArgs) => void;
	FireClient: (player: Player, ...args: TArgs) => void;
	FireAllClients: (...args: TArgs) => void;
	OnServerEvent: RBXScriptSignal<(player: Player, ...args: TArgs) => void>;
	OnClientEvent: RBXScriptSignal<(...args: TArgs) => void>;
};

export interface Remotes {
	PlayerJoined: TypedRemoteEvent;
	BuyUpgrade: TypedRemoteEvent<[upgradeId: string]>;
	UpdateBalance: TypedRemoteEvent<[newBalance: number]>;
	UpdateMultiplier: TypedRemoteEvent<[newMultiplier: number]>;
}

// Create or get RemoteEvents
export function getRemotes(): Remotes {
	let remotes = ReplicatedStorage.FindFirstChild("Remotes");
	if (!remotes) {
		remotes = new Instance("Folder");
		remotes.Name = "Remotes";
		remotes.Parent = ReplicatedStorage;
	}

	const folder = remotes as Folder;

	function ensureRemote<TKey extends keyof Remotes>(name: TKey): Remotes[TKey] {
		let remote = folder.FindFirstChild(name) as RemoteEvent | undefined;
		if (!remote) {
			remote = new Instance("RemoteEvent");
			remote.Name = name;
			remote.Parent = folder;
		}
		return remote as Remotes[TKey];
	}

	return {
		PlayerJoined: ensureRemote("PlayerJoined"),
		BuyUpgrade: ensureRemote("BuyUpgrade"),
		UpdateBalance: ensureRemote("UpdateBalance"),
		UpdateMultiplier: ensureRemote("UpdateMultiplier"),
	};
}