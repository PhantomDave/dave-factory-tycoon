import { Workspace } from "@rbxts/services";
import type { Product } from "server/models/products/Products";
import { registerTrackedItem } from "server/services/itemMovementService";
import { PRODUCT_CONFIG } from "shared/constants";

export class WoodCube implements Product {
	type = "WoodCube" as const;
	value = 1;

	create(position: Vector3): Model {
		const woodModel = new Instance("Model");
		woodModel.Name = "WoodCube";
		woodModel.SetAttribute("ProductValue", this.value);

		const part = new Instance("Part");
		part.Shape = Enum.PartType.Block;
		part.Size = new Vector3(2, 2, 2);
		part.Material = Enum.Material.Wood;
		part.BrickColor = new BrickColor("Brown");
		part.CanCollide = true;
		part.CanQuery = false;
		part.CastShadow = false;
		part.Anchored = false;
		part.SetAttribute("ProductValue", this.value);
		part.Parent = woodModel;

		woodModel.PrimaryPart = part;
		woodModel.PivotTo(new CFrame(position));
		woodModel.Parent = Workspace;
		part.SetNetworkOwner(undefined);
		registerTrackedItem(woodModel);

		task.delay(PRODUCT_CONFIG.woodCube.lifetime, () => {
			woodModel.Destroy();
		});

		return woodModel;
	}
}
