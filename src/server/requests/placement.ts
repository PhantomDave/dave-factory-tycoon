import { Workspace } from "@rbxts/services";
import { getPlayerData } from "server/data";
import { getAdjacentDropSide, gridCoordToWorld, occupyCell, validatePlacement } from "server/grid";
import { BaseConveyor } from "server/models/conveyors/baseConveyor";
import { BaseMiner } from "server/models/miners/baseMiner";
import { spawnTemplateModel } from "server/models/spawnUtils";
import { getPlayerPlot, getPlotPosition } from "server/plot";
import { logger } from "server/utils/logger";
import { MINING_CONFIG } from "shared/constants";
import { getRemotes } from "shared/remotes";
import { DropSide, GridCoord, PlaceRequest, UPGRADES } from "shared/types";

const MAX_MACHINES_PER_PLOT = 100;
const MAX_SURFACE_OFFSET = 6;

function sideFromRotation(rotationQuarterTurns: number): DropSide {
	switch (rotationQuarterTurns % 4) {
		case 1:
			return "right";
		case 2:
			return "back";
		case 3:
			return "left";
		default:
			return "front";
	}
}

function getSpawnerUpgradeId(machineType: string): string | undefined {
	for (const [upgradeId, upgrade] of pairs(UPGRADES)) {
		if (upgrade.type === "spawner" && upgrade.spawnerTemplate === machineType) {
			return upgradeId;
		}
	}

	return undefined;
}

function authorizePlacement(player: Player, machineType: string, plotFolder: Folder): string | undefined {
	const data = getPlayerData(player);
	if (!data) {
		return "Player data unavailable";
	}

	const upgradeId = getSpawnerUpgradeId(machineType);
	if (!upgradeId) {
		return `Unknown machine type: ${machineType}`;
	}

	const upgrade = UPGRADES[upgradeId];
	const hasUnlock = upgrade.cost <= 0 || data.unlockedUpgrades.includes(upgradeId);
	if (!hasUnlock) {
		return `Unlock ${upgrade.displayName} before placing it`;
	}

	const machineCount = plotFolder
		.GetChildren()
		.filter((child) => child.IsA("Model") || child.IsA("BasePart"))
		.size();
	if (machineCount >= MAX_MACHINES_PER_PLOT) {
		return "Plot machine limit reached";
	}

	if (machineType === "BaseMiner") {
		const minerCount = plotFolder
			.GetChildren()
			.filter((child) => child.Name === "BaseMiner")
			.size();
		if (minerCount >= MINING_CONFIG.MAX_MINERS_PER_PLAYER) {
			return "Miner limit reached";
		}
	}

	return undefined;
}

function getSafeSurfaceY(player: Player, plotFolder: Folder, requestedSurfaceY: number | undefined): number {
	const plotCenter = getPlotPosition(player) ?? new Vector3(0, 0, 0);
	const raycastParams = new RaycastParams();
	raycastParams.FilterType = Enum.RaycastFilterType.Exclude;
	raycastParams.FilterDescendantsInstances = [plotFolder];

	const probeOrigin = plotCenter.add(new Vector3(0, 100, 0));
	const probeResult = Workspace.Raycast(probeOrigin, new Vector3(0, -250, 0), raycastParams);
	const baseY = probeResult ? probeResult.Position.Y : plotCenter.Y;

	if (requestedSurfaceY === undefined) {
		return baseY;
	}

	return math.clamp(requestedSurfaceY, baseY - MAX_SURFACE_OFFSET, baseY + MAX_SURFACE_OFFSET);
}

export function initPlacementHandler(): void {
	const remotes = getRemotes();

	remotes.PlaceRequest.OnServerEvent.Connect((player, request) => {
		const { machineType, coord, surfaceY, rotationQuarterTurns } = request as PlaceRequest;
		const plotFolder = getPlayerPlot(player);
		if (!plotFolder) {
			remotes.PlaceResponse.FireClient(player, { success: false, reason: "No plot assigned" });
			return;
		}

		const authError = authorizePlacement(player, machineType, plotFolder);
		if (authError !== undefined) {
			logger.warn(`${player.Name} placement rejected: ${authError}`);
			remotes.PlaceResponse.FireClient(player, { success: false, reason: authError });
			return;
		}

		const isError = validatePlacement(player, coord, machineType);
		if (isError !== undefined) {
			remotes.PlaceResponse.FireClient(player, { success: false, reason: isError });
			return;
		}

		const safeSurfaceY = getSafeSurfaceY(player, plotFolder, surfaceY);
		const worldCFrame = gridCoordToWorld(player, coord, machineType, safeSurfaceY, rotationQuarterTurns);
		const spawned = spawnMachine(machineType, player, coord, worldCFrame, plotFolder, rotationQuarterTurns);
		if (!spawned) {
			remotes.PlaceResponse.FireClient(player, { success: false, reason: "Unknown machine type" });
			return;
		}

		occupyCell(player, coord, machineType);
		remotes.PlaceResponse.FireClient(player, { success: true });
	});
}

function spawnMachine(
	machineType: string,
	player: Player,
	coord: GridCoord,
	cframe: CFrame,
	plotFolder: Folder,
	rotationQuarterTurns: number,
): boolean {
	if (machineType === "BaseMiner") {
		const miner = new BaseMiner("BaseMiner", player.UserId);
		const adjacent = getAdjacentDropSide(player, coord, machineType);
		miner.dropSide = adjacent === "top" ? sideFromRotation(rotationQuarterTurns) : adjacent;
		miner.spawn(cframe, plotFolder);
		return true;
	}
	if (machineType === "Conveyor") {
		const conveyor = new BaseConveyor();
		conveyor.spawn(cframe, plotFolder);
		return true;
	}
	if (machineType === "SellZone") {
		spawnTemplateModel("SellZone", cframe, plotFolder);
		return true;
	}
	return false;
}
