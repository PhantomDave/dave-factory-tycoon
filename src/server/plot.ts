import { Workspace } from "@rbxts/services";
import { logger } from "server/utils/logger";
import { PLOT_SIZE_STUDS } from "shared/types";

const BUILD_PLATE_SEARCH_RADIUS = 80;
const BUILD_PLATE_SIZE_TOLERANCE = 6;
const plotRandom = new Random();

// One entry per available plot slot. Space plots far enough apart so
// machines spawned inside them never overlap (100 studs per slot).
const PLOT_POSITIONS: Vector3[] = [
	new Vector3(-214.742, 269.891, -539.329),
	new Vector3(-197.848, 269.891, -396.275),
	new Vector3(-407.998, 269.891, -582.325),
	new Vector3(-617.848, 269.891, -396.675),
	new Vector3(-569.623, 269.891, -564.643),
];

interface ResolvedPlotInfo {
	center: Vector3;
	rotationDegrees: number;
	rotationQuarterTurns: number;
}

const plotInfoCache = new Map<number, ResolvedPlotInfo>();

function normalizeDegrees(value: number): number {
	return ((value % 360) + 360) % 360;
}

function normalizeQuarterTurns(value: number): number {
	return ((math.round(value) % 4) + 4) % 4;
}

function resolveBuildPlotInfo(anchor: Vector3): ResolvedPlotInfo {
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

	let rotationDegrees = 0;
	if (bestPart) {
		const [, yawRadians] = bestPart.CFrame.ToOrientation();
		rotationDegrees = normalizeDegrees(math.deg(yawRadians));
	}

	return {
		center: bestPart?.Position ?? anchor,
		rotationDegrees,
		rotationQuarterTurns: normalizeQuarterTurns(rotationDegrees / 90),
	};
}

function getPlotInfo(plotIndex: number): ResolvedPlotInfo {
	const cached = plotInfoCache.get(plotIndex);
	if (cached) {
		return cached;
	}

	const resolved = resolveBuildPlotInfo(PLOT_POSITIONS[plotIndex]);
	plotInfoCache.set(plotIndex, resolved);
	return resolved;
}

interface PlotEntry {
	folder: Folder;
	plotIndex: number;
}

// plotIndex -> Player (which slot is taken)
const plotOwners = new Map<number, Player>();

// Player -> their folder + slot index
const playerPlots = new Map<Player, PlotEntry>();

function getRandomAvailablePlotIndex(): number | undefined {
	const freePlotIndices: number[] = [];

	for (let i = 0; i < PLOT_POSITIONS.size(); i++) {
		if (!plotOwners.has(i)) {
			freePlotIndices.push(i);
		}
	}

	if (freePlotIndices.size() === 0) {
		return undefined;
	}

	return freePlotIndices[plotRandom.NextInteger(0, freePlotIndices.size() - 1)];
}

// Finds a random free slot, creates a Folder at that position,
// and records ownership in both maps. Returns undefined if no slots are free.
export function assignPlot(player: Player): Folder | undefined {
	const plotIndex = getRandomAvailablePlotIndex();

	if (plotIndex === undefined) {
		logger.warn(`No free plots available for ${player.Name}`);
		return undefined;
	}

	// Build properties before parenting so the client receives one
	// replication event, not one per property assignment.
	const folder = new Instance("Folder");
	// Name plots by slot index rather than by owner to avoid leaking ownership.
	folder.Name = `Plot_${plotIndex}`;

	// Store both the spawn anchor and the actual build-plate transform.
	const spawnAnchor = PLOT_POSITIONS[plotIndex];
	const buildPlot = resolveBuildPlotInfo(spawnAnchor);
	plotInfoCache.set(plotIndex, buildPlot);
	folder.SetAttribute("PlotSpawnPosition", spawnAnchor);
	folder.SetAttribute("PlotPosition", buildPlot.center);
	folder.SetAttribute("PlotRotationDegrees", buildPlot.rotationDegrees);
	folder.SetAttribute("PlotRotationQuarterTurns", buildPlot.rotationQuarterTurns);
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
	return storedCenter ?? getPlotInfo(entry.plotIndex).center;
}

export function getPlotRotationDegrees(player: Player): number {
	const entry = playerPlots.get(player);
	if (!entry) return 0;

	const storedDegrees = entry.folder.GetAttribute("PlotRotationDegrees");
	if (typeIs(storedDegrees, "number")) {
		return normalizeDegrees(storedDegrees);
	}

	const storedQuarterTurns = entry.folder.GetAttribute("PlotRotationQuarterTurns");
	if (typeIs(storedQuarterTurns, "number")) {
		return normalizeDegrees(storedQuarterTurns * 90);
	}

	return getPlotInfo(entry.plotIndex).rotationDegrees;
}

export function getPlotRotationQuarterTurns(player: Player): number {
	return normalizeQuarterTurns(getPlotRotationDegrees(player) / 90);
}

export function getNearestPlotPosition(worldPosition: Vector3): Vector3 {
	let nearestCenter = getPlotInfo(0).center;
	let bestDistance = math.huge;

	for (let i = 0; i < PLOT_POSITIONS.size(); i++) {
		const plotInfo = getPlotInfo(i);
		const dx = plotInfo.center.X - worldPosition.X;
		const dz = plotInfo.center.Z - worldPosition.Z;
		const horizontalDistance = math.sqrt(dx * dx + dz * dz);

		if (horizontalDistance < bestDistance) {
			nearestCenter = plotInfo.center;
			bestDistance = horizontalDistance;
		}
	}

	return nearestCenter;
}

export function getNearestPlotRotationDegrees(worldPosition: Vector3): number {
	let nearestRotationDegrees = 0;
	let bestDistance = math.huge;

	for (let i = 0; i < PLOT_POSITIONS.size(); i++) {
		const plotInfo = getPlotInfo(i);
		const dx = plotInfo.center.X - worldPosition.X;
		const dz = plotInfo.center.Z - worldPosition.Z;
		const horizontalDistance = math.sqrt(dx * dx + dz * dz);

		if (horizontalDistance < bestDistance) {
			nearestRotationDegrees = plotInfo.rotationDegrees;
			bestDistance = horizontalDistance;
		}
	}

	return nearestRotationDegrees;
}

export function getNearestPlotRotationQuarterTurns(worldPosition: Vector3): number {
	return normalizeQuarterTurns(getNearestPlotRotationDegrees(worldPosition) / 90);
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
