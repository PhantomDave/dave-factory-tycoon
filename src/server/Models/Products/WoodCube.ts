import { Workspace } from "@rbxts/services";
import type { Product } from "./Products";

const WOOD_CUBE_LIFETIME = 30;

export class WoodCube implements Product {
    type = "WoodCube" as const;
    value = 1;

    create(position: Vector3): Model {
        const woodModel = new Instance("Model");
        woodModel.Name = "WoodCube";

        const part = new Instance("Part");
        part.Shape = Enum.PartType.Block;
        part.Size = new Vector3(2, 2, 2);
        part.Material = Enum.Material.Wood;
        part.BrickColor = new BrickColor("Brown");
        part.CanCollide = false;
        part.Anchored = true;
        part.Parent = woodModel;

        woodModel.PrimaryPart = part;
        woodModel.PivotTo(new CFrame(position));
        woodModel.Parent = Workspace;

        task.delay(WOOD_CUBE_LIFETIME, () => {
            woodModel.Destroy();
        });

        return woodModel;
    }
}