import { Players, ReplicatedStorage, RunService, UserInputService, Workspace } from "@rbxts/services";
import { GridCoord, PlaceRequest, GRID_CELL_SIZE, GRID_COLS, GRID_ROWS } from "shared/types";
import { getRemotes } from "shared/remotes";

enum PlacementState {
    IDLE = "IDLE",
    PLACING = "PLACING"
}

class PlacementController {
    private occupiedCells = new Set<string>();
    private state = PlacementState.IDLE;
    private currentMachineType?: string;
    private currentGridCoord?: GridCoord;
    private ghostModel?: Model;
    private mouse = Players.LocalPlayer.GetMouse();
    private remotes = getRemotes();
    private renderConnection?: RBXScriptConnection;
    private clickConnection?: RBXScriptConnection;
    private rightClickConnection?: RBXScriptConnection;
    private escKeyConnection?: RBXScriptConnection;

    public beginPlacing(machineType: string): void {
        if (this.state === PlacementState.PLACING) {
            this.cancelPlacing();
        }

        this.state = PlacementState.PLACING;
        this.currentMachineType = machineType;
        this.createGhostModel(machineType);
        this.connectMouseEvents();
        print(`Started placing: ${machineType}`);
    }

    public cancelPlacing(): void {
        if (this.state === PlacementState.IDLE) return;

        this.state = PlacementState.IDLE;
        this.currentMachineType = undefined;
        this.currentGridCoord = undefined;
        this.destroyGhostModel();
        this.disconnectMouseEvents();

        print("Placement cancelled");
    }

    private createGhostModel(machineType: string): void {
        const template = ReplicatedStorage.FindFirstChild(machineType);

        if (!template) {
            warn(`Template ${machineType} not found in ReplicatedStorage`);
            this.ghostModel = this.createPlaceholderGhost(machineType);
            return;
        }

        // Handle both Models and BaseParts (same logic as server spawnTemplateModel)
        if (template.IsA("Model")) {
            // Use the Model directly
            this.ghostModel = template.Clone();
        } else if (template.IsA("BasePart")) {
            // Wrap BasePart in a Model (matching server logic)
            const wrappedPart = template.Clone() as BasePart;
            this.ghostModel = new Instance("Model");
            this.ghostModel.Name = machineType;
            wrappedPart.Parent = this.ghostModel;
        } else {
            // Fallback for other types
            warn(`Template ${machineType} is ${template.ClassName}, expected Model or BasePart`);
            this.ghostModel = this.createPlaceholderGhost(machineType);
            return;
        }

        this.ghostModel.Name = `${machineType}_Ghost`;
        this.ghostModel.Parent = Workspace;
        this.makeGhostly(this.ghostModel);
    }

    private createPlaceholderGhost(machineType: string): Model {
        const model = new Instance("Model");
        model.Name = `${machineType}_Ghost`;
        model.Parent = Workspace;

        const part = new Instance("Part");
        part.Name = "PlaceholderPart";
        part.Size = new Vector3(4, 2, 4); // Standard grid cell size
        part.Anchored = true;
        part.CanCollide = false;
        part.Transparency = 0.3;

        // Different colors for different machine types
        if (machineType === "Conveyor") {
            part.Color = Color3.fromRGB(100, 100, 255); // Blue
        } else if (machineType === "SellZone") {
            part.Color = Color3.fromRGB(255, 100, 100); // Red
        } else {
            part.Color = Color3.fromRGB(100, 255, 100); // Green (default)
        }

        part.Parent = model;

        // Add a label
        const billboard = new Instance("BillboardGui");
        billboard.Size = new UDim2(0, 100, 0, 50);
        billboard.Parent = part;

        const label = new Instance("TextLabel");
        label.Size = new UDim2(1, 0, 1, 0);
        label.BackgroundTransparency = 1;
        label.Text = machineType;
        label.TextColor3 = Color3.fromRGB(255, 255, 255);
        label.TextScaled = true;
        label.Font = Enum.Font.GothamBold;
        label.Parent = billboard;

        return model;
    }

    private makeGhostly(model: Model): void {
        for (const descendant of model.GetDescendants()) {
            if (descendant.IsA("BasePart")) {
                descendant.Transparency = 0.5;
                descendant.CanCollide = false;
            }
        }
    }

    private destroyGhostModel(): void {
        if (this.ghostModel) {
            this.ghostModel.Destroy();
            this.ghostModel = undefined;
        }
    }

    private getPlotOrigin(): Vector3 | undefined {
        const player = Players.LocalPlayer;
        const plotNumber = player.GetAttribute("PlotNumber") as number | undefined;

        if (plotNumber === undefined) {
            warn("Player has no assigned plot");
            return undefined;
        }

        const plotFolder = Workspace.FindFirstChild(`Plot_${plotNumber}`);
        if (!plotFolder || !plotFolder.IsA("Folder")) {
            warn(`Plot folder Plot_${plotNumber} not found`);
            return undefined;
        }

        const position = plotFolder.GetAttribute("PlotPosition") as Vector3 | undefined;
        if (!position) {
            warn("Plot folder missing PlotPosition attribute");
            return undefined;
        }

        return position;
    }

     private worldToGrid(worldPos: Vector3, plotOrigin: Vector3): GridCoord {
        const localX = (worldPos.X - plotOrigin.X) / GRID_CELL_SIZE;
        const localZ = (worldPos.Z - plotOrigin.Z) / GRID_CELL_SIZE;

        return {
            x: math.floor(localX),
            z: math.floor(localZ)
        };
    }

    private gridToWorld(coord: GridCoord, plotOrigin: Vector3): CFrame {
        const worldX = plotOrigin.X + coord.x * GRID_CELL_SIZE + GRID_CELL_SIZE / 2;
        const worldZ = plotOrigin.Z + coord.z * GRID_CELL_SIZE + GRID_CELL_SIZE / 2;
        return new CFrame(worldX, plotOrigin.Y, worldZ);
    }

	private isValidGridCoord(coord: GridCoord): boolean {
		const inBounds = coord.x >= 0 && coord.x < GRID_COLS && coord.z >= 0 && coord.z < GRID_ROWS;
		const key = `${coord.x},${coord.z}`;
		const notOccupied = !this.occupiedCells.has(key);
		return inBounds && notOccupied;
	}

    private connectMouseEvents(): void {
        this.renderConnection = RunService.RenderStepped.Connect(() => {
            this.updateGhostPosition();
        });

        this.clickConnection = this.mouse.Button1Down.Connect(() => {
            this.handleLeftClick();
        });

        this.rightClickConnection = this.mouse.Button2Down.Connect(() => {
            this.cancelPlacing();
        });
        this.escKeyConnection = UserInputService.InputBegan.Connect((input) => {
	if (input.KeyCode === Enum.KeyCode.Escape) {
		this.cancelPlacing();
        }
    }); 
    }

    private disconnectMouseEvents(): void {
        this.renderConnection?.Disconnect();
        this.clickConnection?.Disconnect();
        this.rightClickConnection?.Disconnect();
        this.escKeyConnection?.Disconnect();

        this.renderConnection = undefined;
        this.clickConnection = undefined;
        this.rightClickConnection = undefined;
        this.escKeyConnection = undefined;
    }

    private updateGhostPosition(): void {
        if (!this.ghostModel || this.state !== PlacementState.PLACING) return;

        const plotOrigin = this.getPlotOrigin();
        if (!plotOrigin) return;

        const camera = Workspace.CurrentCamera!;
        const unitRay = camera.ScreenPointToRay(this.mouse.X, this.mouse.Y);

        const raycastParams = new RaycastParams();
        raycastParams.FilterType = Enum.RaycastFilterType.Exclude;
        raycastParams.FilterDescendantsInstances = [this.ghostModel];

        const raycastResult = Workspace.Raycast(unitRay.Origin, unitRay.Direction.mul(1000), raycastParams);

        if (raycastResult) {
            const gridCoord = this.worldToGrid(raycastResult.Position, plotOrigin);
            this.currentGridCoord = gridCoord; // Track current grid position

            const snappedCFrame = this.gridToWorld(gridCoord, plotOrigin);
            this.ghostModel.PivotTo(snappedCFrame);

            const isValid = this.isValidGridCoord(gridCoord);
            this.colorGhost(isValid);
        }
    }

    private colorGhost(isValid: boolean): void {
        if (!this.ghostModel) return;

        const color = isValid ? Color3.fromRGB(0, 255, 0) : Color3.fromRGB(255, 0, 0);

        for (const descendant of this.ghostModel.GetDescendants()) {
            if (descendant.IsA("BasePart")) {
                descendant.Color = color;
            }
        }
    }

    private handleLeftClick(): void {
        if (this.state !== PlacementState.PLACING || !this.currentMachineType) return;

        const plotOrigin = this.getPlotOrigin();
        if (!plotOrigin) return;

        // Get current grid position
        const camera = Workspace.CurrentCamera!;
        const unitRay = camera.ScreenPointToRay(this.mouse.X, this.mouse.Y);

        const raycastParams = new RaycastParams();
        raycastParams.FilterType = Enum.RaycastFilterType.Exclude;
        raycastParams.FilterDescendantsInstances = [this.ghostModel!];

        const raycastResult = Workspace.Raycast(unitRay.Origin, unitRay.Direction.mul(1000), raycastParams);

        if (raycastResult) {
            const gridCoord = this.worldToGrid(raycastResult.Position, plotOrigin);

            if (this.isValidGridCoord(gridCoord)) {
                this.sendPlaceRequest(gridCoord);
                this.destroyGhostModel();
            } else {
                print("Cannot place here - invalid location");
            }
        }
    }

    private sendPlaceRequest(coord: GridCoord): void {
        if (!this.currentMachineType) return;

        const request: PlaceRequest = {
            machineType: this.currentMachineType,
            coord: coord
        };

        print(`Sending place request: ${this.currentMachineType} at (${coord.x}, ${coord.z})`);
        this.remotes.PlaceRequest.FireServer(request);

        const connection = this.remotes.PlaceResponse.OnClientEvent.Connect((response) => {
            connection.Disconnect();
            this.handlePlaceResponse(response);
        });
    }

    private handlePlaceResponse(response: { success: boolean; reason?: string }): void {
        if (response.success && this.currentGridCoord) {
            const key = `${this.currentGridCoord.x},${this.currentGridCoord.z}`;
            this.occupiedCells.add(key);
            print("Machine placed successfully!");
            this.cancelPlacing(); // Reset placement state
        } else {
            print(`Placement failed: ${response.reason || "Unknown error"}`);
            if (this.currentMachineType) {
                this.createGhostModel(this.currentMachineType);
            }
        }
    }


}

export const placementController = new PlacementController();