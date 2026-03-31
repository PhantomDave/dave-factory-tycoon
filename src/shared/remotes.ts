import { ReplicatedStorage } from "@rbxts/services";

// Create or get RemoteEvents
export function getRemotes() {
	let remotes = ReplicatedStorage.FindFirstChild("Remotes");
	if (!remotes) {
		remotes = new Instance("Folder");
		remotes.Name = "Remotes";
		remotes.Parent = ReplicatedStorage;
	}

	const folder = remotes as Folder;

	function ensureRemote(name: string) {
		let remote = folder.FindFirstChild(name) as RemoteEvent | undefined;
		if (!remote) {
			remote = new Instance("RemoteEvent");
			remote.Name = name;
			remote.Parent = folder;
		}
		return remote;
	}

	return {
		PlayerJoined: ensureRemote("PlayerJoined"),
		BuyUpgrade: ensureRemote("BuyUpgrade"),
		UpdateBalance: ensureRemote("UpdateBalance"),
		UpdateMultiplier: ensureRemote("UpdateMultiplier"),
	};
}

export type Remotes = ReturnType<typeof getRemotes>;