import { Workspace } from "@rbxts/services";
import { logger } from "server/utils/logger";
import { PLOT_SIZE_STUDS } from "shared/types";

const BUILD_PLATE_SEARCH_RADIUS = 80;
const BUILD_PLATE_SIZE_TOLERANCE = 6;

// One entry per available plot slot. Space plots far enough apart so
// machines spawned inside them never overlap (100 studs per slot).
const PLOT_POSITIONS: Vector3[] = [
	new Vector3(-407.998, 269.891, -582.325),
	new Vector3(-214.742, 269.891, -539.329),
	new Vector3(-197.848, 269.891, -396.275),
	new Vector3(-617.848, 269.891, -396.675),
	new Vector3(-569.623, 269.891, -564.643),
];

function resolveBuildPlotCenter(anchor: Vector3): Vector3 {
	let bestPart: BasePart | undefined;
	let bestDistance = math.huge;

	for (const descendant of Workspace.GetDescendants()) {
		if (!descendant.IsA("BasePart") || !descendant.Anchored || descendant.Size.Y > 5) {
			continue;
		}

		const matchesX = math.abs(descendant.Size.X - PLOT_SIZE_STUDS) <= BUILD_PLATE_SIZE_TOLERANCE;
		const matchesZ = math.abs(descendant.Size.Z - PLOT_SIZE_STUDS) <= BUILD_PLATE_SIZE_TOLERANCE;
		if (!matchesX || !matchesZ) {
			continue;
		}

		const dx = descendant.Position.X - anchor.X;
		const dz = descendant.Position.Z - anchor.Z;
		const horizontalDistance = math.sqrt(dx * dx + dz * dz);
		if (horizontalDistance > BUILD_PLATE_SEARCH_RADIUS || horizontalDistance >= bestDistance) {
			continue;
		}

		bestPart = descendant;
		bestDistance = horizontalDistance;
	}

	return bestPart?.Position ?? anchor;
}

interface PlotEntry {
	folder: Folder;
	plotIndex: number;
}

// plotIndex -> Player (which slot is taken)
const plotOwners = new Map<number, Player>();

// Player -> their folder + slot index
const playerPlots = new Map<Player, PlotEntry>();

// Finds the first free slot, creates a Folder at that position,
// and records ownership in both maps. Returns undefined if no slots are free.
export function assignPlot(player: Player): Folder | undefined {
	let plotIndex = -1;
	for (let i = 0; i < PLOT_POSITIONS.size(); i++) {
		if (!plotOwners.has(i)) {
			plotIndex = i;
			break;
		}
	}

	if (plotIndex === -1) {
		logger.warn(`No free plots available for ${player.Name}`);
		return undefined;
	}

	// Build properties before parenting so the client receives one
	// replication event, not one per property assignment.
	const folder = new Instance("Folder");
	// Name plots by slot index rather than by owner to avoid leaking ownership.
	folder.Name = `Plot_${plotIndex}`;

	// Store both the spawn anchor and the actual build-plate center.
	const spawnAnchor = PLOT_POSITIONS[plotIndex];
	const buildPlotCenter = resolveBuildPlotCenter(spawnAnchor);
	folder.SetAttribute("PlotSpawnPosition", spawnAnchor);
	folder.SetAttribute("PlotPosition", buildPlotCenter);
	player.SetAttribute("PlotNumber", plotIndex);

	// Parent last — triggers replication.
	folder.Parent = Workspace;

	plotOwners.set(plotIndex, player);
	playerPlots.set(player, { folder, plotIndex });

	logger.info(`Assigned plot ${plotIndex} to ${player.Name}`);
	return folder;
}

// Destroys the player's folder and frees the slot.
export function releasePlot(player: Player): void {
	const entry = playerPlots.get(player);
	if (!entry) return;

	entry.folder.Destroy();
	plotOwners.delete(entry.plotIndex);
	playerPlots.delete(player);

	logger.info(`Released plot ${entry.plotIndex} from ${player.Name}`);
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

	const storedCenter = entry.folder.GetAttribute("PlotPosition") as Vector3 | undefined;
	return storedCenter ?? resolveBuildPlotCenter(PLOT_POSITIONS[entry.plotIndex]);
}

// Teleports a freshly spawned character to stand above the plot spawn anchor.
// WaitForChild uses a timeout so this never hangs indefinitely on edge cases
// like rapid respawn or character cleanup.
export function spawnPlayerAtPlot(player: Player, character: Model): void {
	const entry = playerPlots.get(player);
	if (!entry) return;

	const spawnPos =
		(entry.folder.GetAttribute("PlotSpawnPosition") as Vector3 | undefined) ?? PLOT_POSITIONS[entry.plotIndex];
	const hrp = character.WaitForChild("HumanoidRootPart", 5);
	if (!hrp || !hrp.IsA("BasePart")) return;
	(hrp as BasePart).CFrame = new CFrame(spawnPos.add(new Vector3(0, 5, 0)));
}
