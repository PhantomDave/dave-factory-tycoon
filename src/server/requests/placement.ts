import { gridCoordToWorld, occupyCell, validatePlacement } from "server/grid";
import { BaseConveyor } from "server/models/conveyors/baseConveyor";
import { BaseMiner } from "server/models/miners/baseMiner";
import { spawnTemplateModel } from "server/models/spawnUtils";
import { getPlayerPlot } from "server/plot";
import { getRemotes } from "shared/remotes";
import { PlaceRequest } from "shared/types";

export function initPlacementHandler(): void {
  const remotes = getRemotes();

  remotes.PlaceRequest.OnServerEvent.Connect((player, request) => {
    const { machineType, coord } = request as PlaceRequest;

    // 1. Validate the cell.
    const isError = validatePlacement(player, coord);
    if (isError !== undefined) {
      remotes.PlaceResponse.FireClient(player, { success: false, reason: isError });
      return;
    }

    // 2. Resolve the target CFrame and plot folder.
    const worldCFrame = gridCoordToWorld(player, coord);
    const plotFolder  = getPlayerPlot(player) ?? new Instance("Folder");

    // 3. Attempt to spawn the requested machine type.
    const spawned = spawnMachine(machineType, player, worldCFrame, plotFolder);
    if (!spawned) {
      remotes.PlaceResponse.FireClient(player, { success: false, reason: "Unknown machine type" });
      return;
    }

    occupyCell(player, coord);
    remotes.PlaceResponse.FireClient(player, { success: true });
  });
}

function spawnMachine(
  machineType: string,
  player: Player,
  cframe: CFrame,
  plotFolder: Folder,
): boolean {
  // Delegates to the existing class-based spawn system.
  // Each class's spawnModel is updated below to accept a CFrame and a parent folder.
  if (machineType === "BaseMiner") {
    const miner = new BaseMiner("BaseMiner", player.UserId);
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