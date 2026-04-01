import { Players, ReplicatedStorage, RunService, UserInputService, Workspace } from "@rbxts/services";
import { GridCoord, PlaceRequest, GRID_CELL_SIZE, PLOT_SIZE, MACHINE_SIZES, DropSide } from "shared/types";
import { getRemotes } from "shared/remotes";
import { getPlotMinCorner, gridCoordToWorldPos, worldToGridCoord } from "shared/gridMath";

enum PlacementState {
    IDLE = "IDLE",
    PLACING = "PLACING"
}

class PlacementController {
    /** Maps "x,z" cell key → machine type string, for adjacency checks. */
    private occupiedCells = new Map<string, string>();
    private state = PlacementState.IDLE;
    private currentMachineType?: string;
    private currentGridCoord?: GridCoord;
    private ghostModel?: Model;
    private gridOverlay?: Part;
    private mouse = Players.LocalPlayer.GetMouse();
    private remotes = getRemotes();
    private renderConnection?: RBXScriptConnection;
    private clickConnection?: RBXScriptConnection;
    private rightClickConnection?: RBXScriptConnection;
    private escKeyConnection?: RBXScriptConnection;

    /** How much above the plot floor Y the ghost pivot must sit so the model bottom is flush. */
    private ghostHeightOffset = 0;
    /** Bounding box size of the ghost, computed once per ghost in createGhostModel. */
    private ghostBBSize?: Vector3;
    /** Neon indicator showing which side products will drop from (miners only). */
    private dropSideIndicator?: Part;
    /** Per-cell neon highlight parts showing the current footprint state. */
    private cellHighlights: Part[] = [];
    /** Number of clockwise 90-degree turns applied to the current ghost. */
    private rotationQuarterTurns = 0;

    public beginPlacing(machineType: string): void {
        if (this.state === PlacementState.PLACING) {
            this.cancelPlacing();
        }

        this.state = PlacementState.PLACING;
        this.currentMachineType = machineType;
        this.rotationQuarterTurns = 0;
        this.createGhostModel(machineType);
        this.createGridOverlay();
        this.connectMouseEvents();
        print(`Started placing: ${machineType}`);
    }

    public cancelPlacing(): void {
        if (this.state === PlacementState.IDLE) return;

        this.state = PlacementState.IDLE;
        this.currentMachineType = undefined;
        this.currentGridCoord = undefined;
        this.rotationQuarterTurns = 0;
        this.destroyGhostModel();
        this.destroyGridOverlay();
        this.disconnectMouseEvents();

        print("Placement cancelled");
    }

    private createGhostModel(machineType: string): void {
        const template = ReplicatedStorage.FindFirstChild(machineType);

        if (!template) {
            warn(`Template ${machineType} not found in ReplicatedStorage`);
            this.ghostModel = this.createPlaceholderGhost(machineType);
        } else if (template.IsA("Model")) {
            this.ghostModel = template.Clone();
        } else if (template.IsA("BasePart")) {
            const wrappedPart = template.Clone() as BasePart;
            this.ghostModel = new Instance("Model");
            this.ghostModel.Name = machineType;
            wrappedPart.Parent = this.ghostModel;
        } else {
            warn(`Template ${machineType} is ${template.ClassName}, expected Model or BasePart`);
            this.ghostModel = this.createPlaceholderGhost(machineType);
        }

        this.ghostModel.Name = `${machineType}_Ghost`;
        this.ghostModel.Parent = Workspace;
        this.makeGhostly(this.ghostModel);

        // Compute how far above plot-floor-Y the pivot must sit so the model bottom is flush.
        this.ghostModel.PivotTo(new CFrame(0, 1000, 0));
        const [bbCf, bbSize] = this.ghostModel.GetBoundingBox();
        const bbBottom = bbCf.Position.Y - bbSize.Y / 2;
        this.ghostHeightOffset = 1000 - bbBottom;
        this.ghostBBSize = bbSize;

        // For miners, add a neon indicator showing the drop side.
        if (machineType === "BaseMiner") {
            this.dropSideIndicator = this.createDropSideIndicator();
        }

        this.createCellHighlights(machineType);
    }

    private createDropSideIndicator(): Part {
        const part = new Instance("Part");
        part.Name = "DropSideIndicator";
        part.Size = new Vector3(0.4, 0.4, GRID_CELL_SIZE * 0.8);
        part.Anchored = true;
        part.CanCollide = false;
        part.Material = Enum.Material.Neon;
        part.Color = Color3.fromRGB(255, 160, 0);
        part.Transparency = 0.1;
        part.CastShadow = false;
        part.Parent = this.ghostModel;
        return part;
    }

    private createPlaceholderGhost(machineType: string): Model {
        const model = new Instance("Model");
        model.Name = `${machineType}_Ghost`;
        model.Parent = Workspace;

        const size = MACHINE_SIZES[machineType] || { width: 1, height: 1 };

        const part = new Instance("Part");
        part.Name = "PlaceholderPart";
        part.Size = new Vector3(
            size.width * GRID_CELL_SIZE,
            2,
            size.height * GRID_CELL_SIZE
        );
        part.Anchored = true;
        part.CanCollide = false;
        part.Transparency = 0.3;

        if (machineType === "Conveyor") {
            part.Color = Color3.fromRGB(100, 100, 255);
        } else if (machineType === "SellZone") {
            part.Color = Color3.fromRGB(255, 100, 100);
        } else {
            part.Color = Color3.fromRGB(100, 255, 100);
        }

        part.Parent = model;

        const billboard = new Instance("BillboardGui");
        billboard.Size = new UDim2(0, 100, 0, 50);
        billboard.Parent = part;

        const label = new Instance("TextLabel");
        label.Size = new UDim2(1, 0, 1, 0);
        label.BackgroundTransparency = 1;
        label.Text = `${machineType} (${size.width}x${size.height})`;
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

    private createCellHighlights(machineType: string): void {
        this.destroyCellHighlights();

        const size = MACHINE_SIZES[machineType] || { width: 1, height: 1 };
        for (let x = 0; x < size.width; x++) {
            for (let z = 0; z < size.height; z++) {
                const part = new Instance("Part");
                part.Name = "PlacementCellHighlight";
                part.Size = new Vector3(GRID_CELL_SIZE * 0.9, 0.12, GRID_CELL_SIZE * 0.9);
                part.Anchored = true;
                part.CanCollide = false;
                part.CanQuery = false;
                part.Material = Enum.Material.Neon;
                part.Color = Color3.fromRGB(0, 255, 140);
                part.Transparency = 0.4;
                part.CastShadow = false;
                part.Parent = Workspace;
                this.cellHighlights.push(part);
            }
        }
    }

    private destroyCellHighlights(): void {
        for (const part of this.cellHighlights) {
            part.Destroy();
        }
        this.cellHighlights = [];
    }

    private updateCellHighlights(coord: GridCoord, plotCenter: Vector3, surfaceY: number): void {
        if (!this.currentMachineType || this.cellHighlights.size() === 0) return;

        const size = MACHINE_SIZES[this.currentMachineType] || { width: 1, height: 1 };
        const plotMinCorner = getPlotMinCorner(plotCenter);

        let i = 0;
        for (let x = 0; x < size.width; x++) {
            for (let z = 0; z < size.height; z++) {
                const cell = this.cellHighlights[i++];
                if (!cell) continue;

                const cellX = coord.x + x;
                const cellZ = coord.z + z;
                const outOfBounds = cellX < 0 || cellX >= PLOT_SIZE || cellZ < 0 || cellZ >= PLOT_SIZE;
                const occupied = this.occupiedCells.has(`${cellX},${cellZ}`);
                cell.Color = (outOfBounds || occupied)
                    ? Color3.fromRGB(255, 70, 70)
                    : Color3.fromRGB(0, 255, 140);

                const worldX = plotMinCorner.X + (coord.x + x + 0.5) * GRID_CELL_SIZE;
                const worldZ = plotMinCorner.Z + (coord.z + z + 0.5) * GRID_CELL_SIZE;

                cell.CFrame = new CFrame(worldX, surfaceY + 0.12, worldZ);
            }
        }
    }

    private destroyGhostModel(): void {
        if (this.ghostModel) {
            this.ghostModel.Destroy();
            this.ghostModel = undefined;
        }
        this.dropSideIndicator = undefined;
        this.ghostBBSize = undefined;
        this.ghostHeightOffset = 0;
        this.destroyCellHighlights();
    }

    private createGridOverlay(): void {
        const plotCenter = this.getPlotOrigin();
        if (!plotCenter) return;

        const plotSizeStuds = PLOT_SIZE * GRID_CELL_SIZE;

        const plotMinCorner = getPlotMinCorner(plotCenter);
        const probeOrigin = new Vector3(
            plotMinCorner.X + plotSizeStuds / 2,
            plotCenter.Y + 100,
            plotMinCorner.Z + plotSizeStuds / 2,
        );
        const probeResult = Workspace.Raycast(probeOrigin, new Vector3(0, -200, 0));
        const baseY = probeResult ? probeResult.Position.Y + 0.06 : plotCenter.Y + 0.06;

        const overlayPart = new Instance("Part");
        overlayPart.Name = "GridOverlay";
        overlayPart.Size = new Vector3(plotSizeStuds, 0.05, plotSizeStuds);
        overlayPart.CFrame = new CFrame(
            plotMinCorner.X + plotSizeStuds / 2,
            baseY,
            plotMinCorner.Z + plotSizeStuds / 2,
        );
        overlayPart.Anchored = true;
        overlayPart.CanCollide = false;
        overlayPart.CanQuery = false;
        overlayPart.Transparency = 1;
        overlayPart.Parent = Workspace;

        const gui = new Instance("SurfaceGui");
        gui.Name = "GridOverlayGui";
        gui.Face = Enum.NormalId.Top;
        gui.SizingMode = Enum.SurfaceGuiSizingMode.PixelsPerStud;
        gui.PixelsPerStud = 12;
        gui.AlwaysOnTop = false;
        gui.Parent = overlayPart;

        const bg = new Instance("Frame");
        bg.Size = new UDim2(1, 0, 1, 0);
        bg.BackgroundTransparency = 1;
        bg.BorderSizePixel = 0;
        bg.Parent = gui;

        const pixelsPerCell = GRID_CELL_SIZE * gui.PixelsPerStud;
        for (let i = 0; i <= PLOT_SIZE; i++) {
            const vertical = new Instance("Frame");
            vertical.Size = new UDim2(0, 1, 1, 0);
            vertical.Position = new UDim2(0, i * pixelsPerCell, 0, 0);
            vertical.BackgroundColor3 = Color3.fromRGB(90, 150, 255);
            vertical.BackgroundTransparency = 0.55;
            vertical.BorderSizePixel = 0;
            vertical.Parent = bg;

            const horizontal = new Instance("Frame");
            horizontal.Size = new UDim2(1, 0, 0, 1);
            horizontal.Position = new UDim2(0, 0, 0, i * pixelsPerCell);
            horizontal.BackgroundColor3 = Color3.fromRGB(90, 150, 255);
            horizontal.BackgroundTransparency = 0.55;
            horizontal.BorderSizePixel = 0;
            horizontal.Parent = bg;
        }

        const cornerSize = 1.2;
        const cornerY = baseY + 0.05;
        const cornerColor = Color3.fromRGB(90, 160, 255);

        const addCorner = (x: number, z: number) => {
            const marker = new Instance("Part");
            marker.Name = "GridOverlayCorner";
            marker.Size = new Vector3(cornerSize, 0.08, cornerSize);
            marker.CFrame = new CFrame(x, cornerY, z);
            marker.Anchored = true;
            marker.CanCollide = false;
            marker.CanQuery = false;
            marker.Material = Enum.Material.Neon;
            marker.Color = cornerColor;
            marker.Transparency = 0.35;
            marker.CastShadow = false;
            marker.Parent = overlayPart;
        };

        addCorner(plotMinCorner.X, plotMinCorner.Z);
        addCorner(plotMinCorner.X + plotSizeStuds, plotMinCorner.Z);
        addCorner(plotMinCorner.X, plotMinCorner.Z + plotSizeStuds);
        addCorner(plotMinCorner.X + plotSizeStuds, plotMinCorner.Z + plotSizeStuds);

        this.gridOverlay = overlayPart;
        print(`Grid overlay created at (${plotCenter.X}, ${plotCenter.Y}, ${plotCenter.Z})`);
    }

    private destroyGridOverlay(): void {
        if (this.gridOverlay) {
            this.gridOverlay.Destroy();
            this.gridOverlay = undefined;
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
        return worldToGridCoord(worldPos, plotOrigin, this.currentMachineType);
    }

    private gridToWorld(coord: GridCoord, plotOrigin: Vector3, machineType: string): CFrame {
        const worldPos = gridCoordToWorldPos(coord, plotOrigin, machineType);
        return new CFrame(worldPos);
    }

    private isValidGridCoord(coord: GridCoord, machineType: string = "Conveyor"): boolean {
        const size = MACHINE_SIZES[machineType];
        if (!size) {
            warn(`Unknown machine type: ${machineType}`);
            return false;
        }

        for (let x = 0; x < size.width; x++) {
            for (let z = 0; z < size.height; z++) {
                const cellX = coord.x + x;
                const cellZ = coord.z + z;

                if (cellX < 0 || cellX >= PLOT_SIZE || cellZ < 0 || cellZ >= PLOT_SIZE) {
                    return false;
                }

                const key = `${cellX},${cellZ}`;
                if (this.occupiedCells.has(key)) {
                    return false;
                }
            }
        }
        return true;
    }

    private getMachineFootprint(coord: GridCoord, machineType: string): GridCoord[] {
        const size = MACHINE_SIZES[machineType];
        if (!size) return [coord];

        const footprint: GridCoord[] = [];
        for (let x = 0; x < size.width; x++) {
            for (let z = 0; z < size.height; z++) {
                footprint.push({ x: coord.x + x, z: coord.z + z });
            }
        }
        return footprint;
    }

    /**
     * Mirrors the server-side logic from grid.getAdjacentDropSide.
     * Scans adjacent cells for a conveyor and returns the DropSide toward it.
     */
    private getAutoDropSide(coord: GridCoord, machineType: string): DropSide {
        const size = MACHINE_SIZES[machineType];
        if (!size) return this.getRotationDropSide();

        const isConveyor = (x: number, z: number) =>
            this.occupiedCells.get(`${x},${z}`) === "Conveyor";

        for (let z = 0; z < size.height; z++) {
            if (isConveyor(coord.x + size.width, coord.z + z)) return "right";
        }
        for (let z = 0; z < size.height; z++) {
            if (isConveyor(coord.x - 1, coord.z + z)) return "left";
        }
        for (let x = 0; x < size.width; x++) {
            if (isConveyor(coord.x + x, coord.z + size.height)) return "back";
        }
        for (let x = 0; x < size.width; x++) {
            if (isConveyor(coord.x + x, coord.z - 1)) return "front";
        }

        return this.getRotationDropSide();
    }

    private getRotationDropSide(): DropSide {
        switch (this.rotationQuarterTurns % 4) {
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

    /** Updates the neon indicator to show the current auto drop side. */
    private updateDropSideIndicator(): void {
        if (!this.dropSideIndicator || !this.ghostModel || !this.currentGridCoord || !this.currentMachineType) return;

        const [bbCf, bbSize] = this.ghostModel.GetBoundingBox();
        const side = this.getAutoDropSide(this.currentGridCoord, this.currentMachineType);

        const cx = bbCf.Position.X;
        const cy = bbCf.Position.Y; // BB center
        const cz = bbCf.Position.Z;
        const halfX = bbSize.X / 2 + GRID_CELL_SIZE / 2;
        const halfZ = bbSize.Z / 2 + GRID_CELL_SIZE / 2;
        const barLen = GRID_CELL_SIZE * 0.8;

        switch (side) {
            case "right":
                this.dropSideIndicator.Size   = new Vector3(barLen, 0.4, 0.4);
                this.dropSideIndicator.CFrame = new CFrame(cx + halfX, cy, cz);
                break;
            case "left":
                this.dropSideIndicator.Size   = new Vector3(barLen, 0.4, 0.4);
                this.dropSideIndicator.CFrame = new CFrame(cx - halfX, cy, cz);
                break;
            case "back":
                this.dropSideIndicator.Size   = new Vector3(0.4, 0.4, barLen);
                this.dropSideIndicator.CFrame = new CFrame(cx, cy, cz + halfZ);
                break;
            case "front":
                this.dropSideIndicator.Size   = new Vector3(0.4, 0.4, barLen);
                this.dropSideIndicator.CFrame = new CFrame(cx, cy, cz - halfZ);
                break;
            default: // top — show a vertical bar above the miner
                this.dropSideIndicator.Size   = new Vector3(0.4, barLen, 0.4);
                this.dropSideIndicator.CFrame = new CFrame(cx, bbCf.Position.Y + bbSize.Y / 2 + barLen / 2, cz);
        }
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

        this.escKeyConnection = UserInputService.InputBegan.Connect((input, gameProcessed) => {
            if (gameProcessed) return;

            if (input.KeyCode === Enum.KeyCode.Escape) {
                this.cancelPlacing();
                return;
            }

            if (input.KeyCode === Enum.KeyCode.R && this.state === PlacementState.PLACING) {
                this.rotationQuarterTurns = (this.rotationQuarterTurns + 1) % 4;
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
        if (!this.ghostModel || this.state !== PlacementState.PLACING || !this.currentMachineType) return;

        const plotOrigin = this.getPlotOrigin();
        if (!plotOrigin) return;

        const camera = Workspace.CurrentCamera!;
        const unitRay = camera.ScreenPointToRay(this.mouse.X, this.mouse.Y);

        const raycastParams = new RaycastParams();
        raycastParams.FilterType = Enum.RaycastFilterType.Exclude;
        // Exclude the ghost and cell highlights so the ray hits the plate, not our own parts.
        raycastParams.FilterDescendantsInstances = [this.ghostModel, ...this.cellHighlights];

        const raycastResult = Workspace.Raycast(unitRay.Origin, unitRay.Direction.mul(1000), raycastParams);

        if (raycastResult) {
            const surfaceY = raycastResult.Position.Y;

            const gridCoord = this.worldToGrid(raycastResult.Position, plotOrigin);
            this.currentGridCoord = gridCoord;

            // Snap to grid, then lift the ghost so its bottom sits at the plot floor.
            const snappedCFrame = this.gridToWorld(gridCoord, plotOrigin, this.currentMachineType);
            const liftedY = surfaceY + this.ghostHeightOffset;
            const baseCFrame = new CFrame(snappedCFrame.Position.X, liftedY, snappedCFrame.Position.Z);
            const rotation = CFrame.Angles(0, math.rad(this.rotationQuarterTurns * 90), 0);
            this.ghostModel.PivotTo(baseCFrame.mul(rotation));

            const isValid = this.isValidGridCoord(gridCoord, this.currentMachineType);
            this.colorGhost(isValid);
            this.updateCellHighlights(gridCoord, plotOrigin, surfaceY);
            this.updateDropSideIndicator();
        }
    }

    private colorGhost(isValid: boolean): void {
        if (!this.ghostModel) return;

        const color = isValid ? Color3.fromRGB(0, 255, 0) : Color3.fromRGB(255, 0, 0);

        for (const descendant of this.ghostModel.GetDescendants()) {
            if (descendant.IsA("BasePart") && descendant !== this.dropSideIndicator) {
                descendant.Color = color;
            }
        }
    }

    private handleLeftClick(): void {
        if (this.state !== PlacementState.PLACING || !this.currentMachineType) return;

        const plotOrigin = this.getPlotOrigin();
        if (!plotOrigin) return;

        const camera = Workspace.CurrentCamera!;
        const unitRay = camera.ScreenPointToRay(this.mouse.X, this.mouse.Y);

        const raycastParams = new RaycastParams();
        raycastParams.FilterType = Enum.RaycastFilterType.Exclude;
        raycastParams.FilterDescendantsInstances = [this.ghostModel!];

        const raycastResult = Workspace.Raycast(unitRay.Origin, unitRay.Direction.mul(1000), raycastParams);

        if (raycastResult) {
            const gridCoord = this.worldToGrid(raycastResult.Position, plotOrigin);

            if (this.isValidGridCoord(gridCoord, this.currentMachineType)) {
                this.sendPlaceRequest(gridCoord, raycastResult.Position.Y);
                this.destroyGhostModel();
            } else {
                print("Cannot place here - invalid location");
            }
        }
    }

    private sendPlaceRequest(coord: GridCoord, surfaceY: number): void {
        if (!this.currentMachineType) return;

        const request: PlaceRequest = {
            machineType: this.currentMachineType,
            coord: coord,
            surfaceY: surfaceY,
            rotationQuarterTurns: this.rotationQuarterTurns,
        };

        print(`[CLIENT DEBUG] Sending place request: ${this.currentMachineType} at grid (${coord.x}, ${coord.z})`);
        this.remotes.PlaceRequest.FireServer(request);

        const connection = this.remotes.PlaceResponse.OnClientEvent.Connect((response) => {
            connection.Disconnect();
            this.handlePlaceResponse(response);
        });
    }

    private handlePlaceResponse(response: { success: boolean; reason?: string }): void {
        if (response.success && this.currentGridCoord && this.currentMachineType) {
            const machineType = this.currentMachineType;
            const footprint = this.getMachineFootprint(this.currentGridCoord, machineType);
            for (const cell of footprint) {
                this.occupiedCells.set(`${cell.x},${cell.z}`, machineType);
            }
            print("Machine placed successfully!");
            this.cancelPlacing();
        } else {
            print(`Placement failed: ${response.reason || "Unknown error"}`);
            if (this.currentMachineType) {
                this.createGhostModel(this.currentMachineType);
            }
        }
    }

}

export const placementController = new PlacementController();
