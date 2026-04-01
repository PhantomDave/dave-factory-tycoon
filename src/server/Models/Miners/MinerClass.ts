import { ReplicatedStorage, Workspace } from "@rbxts/services";
import type { Product } from "../Products/Products";

export abstract class MinerClass {
	value: number;
	model: Model;
	templateName: string;
	product: Product;

	constructor(product: Product, templateName = "BaseMiner") {
		this.value = 0;
		this.templateName = templateName;
		this.model = new Instance("Model");
		this.product = product;
	}

	abstract getInterval(): number;

	getSpawnPosition(): Vector3 {
		if (this.model.PrimaryPart) {
			return this.model.PrimaryPart.Position.add(new Vector3(0, 5, 0));
		}
		return new Vector3(0, 0, 0);
	}

	spawnProduct(position: Vector3 = new Vector3(0, 0, 0)): Model {
		return this.product.create(position);
	}

	spawnModel(position: Vector3 = new Vector3(0, 0, 0)): Model {
		const template = ReplicatedStorage.FindFirstChild(this.templateName);
		if (!template || !template.IsA("Model")) {
			error(`Template '${this.templateName}' not found in ReplicatedStorage or is not a Model`);
		}

		const spawnedModel = template.Clone();
		this.model = spawnedModel;

		// Set PrimaryPart if not set
		if (!this.model.PrimaryPart) {
			this.model.PrimaryPart = this.model.FindFirstChildWhichIsA("BasePart") as BasePart;
		}

		// Use PivotTo for reliable positioning
		if (this.model.PrimaryPart) {
			this.model.PivotTo(new CFrame(position));
		}

		this.model.Parent = Workspace;

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
