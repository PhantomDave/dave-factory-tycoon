import { spawnTemplateModel } from "server/models/spawnUtils";
import type { Product } from "server/models/products/Products";
import { GRID_CELL_SIZE } from "shared/types";
import type { DropSide } from "shared/types";

export abstract class MinerClass {
	value: number;
	model: Model;
	templateName: string;
	product: Product;
	ownerUserId?: number;
	/** Which side of the miner products are ejected toward. Defaults to "top". */
	dropSide: DropSide = "top";

	constructor(product: Product, templateName = "BaseMiner", ownerUserId?: number) {
		this.value = 0;
		this.templateName = templateName;
		this.model = new Instance("Model");
		this.product = product;
		this.ownerUserId = ownerUserId;
	}

	abstract getInterval(): number;

	getSpawnPosition(): Vector3 {
		const [boundingCf, boundingSize] = this.model.GetBoundingBox();

		// Spawn just above the top surface so the product clears the miner and falls freely.
		const topY = boundingCf.Position.Y + boundingSize.Y / 2 + 1;

		if (this.dropSide === "top") {
			return new Vector3(boundingCf.Position.X, topY, boundingCf.Position.Z);
		}

		// Offset horizontally to the center of the adjacent grid cell beyond the miner's edge.
		const sideReach = boundingSize.X / 2 + GRID_CELL_SIZE / 2;
		const lookReach = boundingSize.Z / 2 + GRID_CELL_SIZE / 2;

		// Use the model's orientation so rotated miners still eject in the correct local direction.
		const right = boundingCf.RightVector;
		const look = boundingCf.LookVector;

		let offset: Vector3;
		switch (this.dropSide) {
			case "right": offset = right.mul(sideReach); break;
			case "left":  offset = right.mul(-sideReach); break;
			case "front": offset = look.mul(lookReach); break;
			case "back":  offset = look.mul(-lookReach); break;
			default:      offset = new Vector3(0, 0, 0);
		}

		const pos = boundingCf.Position.add(offset);
		return new Vector3(pos.X, topY, pos.Z);
	}

	spawnProduct(position: Vector3 = new Vector3(0, 0, 0)): Model {
		const spawnedProduct = this.product.create(position);
		spawnedProduct.SetAttribute("ProductValue", this.product.value);

		if (this.ownerUserId !== undefined) {
			spawnedProduct.SetAttribute("ProductOwnerUserId", this.ownerUserId);
			const primaryPart = spawnedProduct.PrimaryPart;
			if (primaryPart) {
				primaryPart.SetAttribute("ProductOwnerUserId", this.ownerUserId);
				primaryPart.SetAttribute("ProductValue", this.product.value);
			}
		}

		return spawnedProduct;
	}

	spawnModel(cframe: CFrame, parent: Instance): Model {
		const spawnedModel = spawnTemplateModel(this.templateName, cframe, parent);
		this.model = spawnedModel;
		return this.model;
	}

	spawn(cframe: CFrame, parent: Instance): void {
		this.spawnModel(cframe, parent);
	}

	startMining(): void {
		task.spawn(() => {
			// Continue mining only while this miner's model is part of the data model.
			while (this.model.Parent) {
				task.wait(this.getInterval());

				// Re-check parent after waiting in case the model was removed during the delay.
				if (!this.model.Parent) {
					break;
				}

				this.spawnProduct(this.getSpawnPosition());
			}
		});
	}
}
