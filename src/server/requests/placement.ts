import { gridCoordToWorld, occupyCell, validatePlacement, getAdjacentDropSide } from "server/grid";
import { BaseConveyor } from "server/models/conveyors/baseConveyor";
import { BaseMiner } from "server/models/miners/baseMiner";
import { spawnTemplateModel } from "server/models/spawnUtils";
import { getPlayerPlot } from "server/plot";
import { getRemotes } from "shared/remotes";
import { PlaceRequest, GridCoord, DropSide } from "shared/types";

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

export function initPlacementHandler(): void {
  const remotes = getRemotes();

  remotes.PlaceRequest.OnServerEvent.Connect((player, request) => {
    const { machineType, coord, surfaceY, rotationQuarterTurns } = request as PlaceRequest;

    // 1. Validate the cell.
    const isError = validatePlacement(player, coord, machineType);
    if (isError !== undefined) {
      remotes.PlaceResponse.FireClient(player, { success: false, reason: isError });
      return;
    }

    // 2. Resolve the target CFrame using the footprint center and the client's surface Y.
    const worldCFrame = gridCoordToWorld(player, coord, machineType, surfaceY, rotationQuarterTurns);
    const plotFolder  = getPlayerPlot(player) ?? new Instance("Folder");

    // 3. Attempt to spawn the requested machine type.
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
    // Prefer adjacent conveyor direction, otherwise use placement rotation as default side.
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
