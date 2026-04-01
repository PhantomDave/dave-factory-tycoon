import { spawnTemplateModel } from "server/models/spawnUtils";
import type { Product } from "../products/Products";

export abstract class MinerClass {
	value: number;
	model: Model;
	templateName: string;
	product: Product;
	ownerUserId?: number;

	constructor(product: Product, templateName = "BaseMiner", ownerUserId?: number) {
		this.value = 0;
		this.templateName = templateName;
		this.model = new Instance("Model");
		this.product = product;
		this.ownerUserId = ownerUserId;
	}

	abstract getInterval(): number;

	getSpawnPosition(): Vector3 {
		if (this.model.PrimaryPart) {
			return this.model.PrimaryPart.Position.add(new Vector3(0, 5, 0));
		}
		return new Vector3(0, 0, 0);
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

	spawnModel(position: Vector3 = new Vector3(0, 0, 0)): Model {
		const spawnedModel = spawnTemplateModel(this.templateName, position);
		this.model = spawnedModel;
		return this.model;
	}

	spawn(position?: Vector3): Model {
		const finalPos = position ?? new Vector3(0, 0, 0);
		return this.spawnModel(finalPos);
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
