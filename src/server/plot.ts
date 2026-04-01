import { Workspace } from "@rbxts/services";

// One entry per available plot slot. Space plots far enough apart so
// machines spawned inside them never overlap (100 studs per slot).
const PLOT_POSITIONS: Vector3[] = [
	new Vector3(-407.998, 269.891, -582.325),
	new Vector3(-214.742, 269.891, -539.329),
	new Vector3(-197.848, 269.891, -396.275),
	new Vector3(-617.848, 269.891, -396.675),
	new Vector3(-569.623, 269.891, -564.643),
];

interface PlotEntry {
	folder: Folder;
	plotIndex: number;
}

// plotIndex -> Player (which slot is taken)
const plotOwners = new Map<number, Player>();

// Player -> their folder + slot index
const playerPlots = new Map<Player, PlotEntry>();

// Finds the first free slot, creates a Folder at that position,
// and records ownership in both maps.
export function assignPlot(player: Player): Folder {
	let plotIndex = -1;
	for (let i = 0; i < PLOT_POSITIONS.size(); i++) {
		if (!plotOwners.has(i)) {
			plotIndex = i;
			break;
		}
	}

	if (plotIndex === -1) {
		error(`No free plots available for ${player.Name}`);
	}

	// Build properties before parenting so the client receives one
	// replication event, not one per property assignment.
	const folder = new Instance("Folder");
	folder.Name = `Plot_${player.UserId}`;

	// Store the assigned position as an attribute so other server code
	// (miners, sell zones) can read where this plot's origin is.
	folder.SetAttribute("PlotPosition", PLOT_POSITIONS[plotIndex]);
	folder.SetAttribute("OwnerUserId", player.UserId);

	// Parent last — triggers replication.
	folder.Parent = Workspace;

	plotOwners.set(plotIndex, player);
	playerPlots.set(player, { folder, plotIndex });

	print(`✅ Assigned plot ${plotIndex} to ${player.Name}`);
	return folder;
}

// Destroys the player's folder and frees the slot.
export function releasePlot(player: Player): void {
	const entry = playerPlots.get(player);
	if (!entry) return;

	entry.folder.Destroy();
	plotOwners.delete(entry.plotIndex);
	playerPlots.delete(player);

	print(`🗑️ Released plot ${entry.plotIndex} from ${player.Name}`);
}

// Used by other server modules (miners, sell zones) to find the
// correct Workspace container for a given player.
export function getPlayerPlot(player: Player): Folder | undefined {
	return playerPlots.get(player)?.folder;
}

// Returns the world-space origin of the player's plot, or undefined
// if the player has no plot assigned.
export function getPlotPosition(player: Player): Vector3 | undefined {
	const entry = playerPlots.get(player);
	if (!entry) return undefined;
	return PLOT_POSITIONS[entry.plotIndex];
}

// Teleports a freshly spawned character to stand above the plot origin.
// Pass the character from CharacterAdded — WaitForChild blocks until
// HumanoidRootPart is ready before setting CFrame.
export function spawnPlayerAtPlot(player: Player, character: Model): void {
	const pos = getPlotPosition(player);
	if (!pos) return;
	const hrp = character.WaitForChild("HumanoidRootPart") as BasePart;
	hrp.CFrame = new CFrame(pos.add(new Vector3(0, 5, 0)));
}