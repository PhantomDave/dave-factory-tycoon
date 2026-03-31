import { ReplicatedStorage, Workspace } from "@rbxts/services";
import type { Product } from "../Products/Products";

export abstract class MinerClass {
	value: number;
	model: Model;
	templateName: string;
	product: Product;

	constructor(templateName: string = "BaseMiner", product: Product) {
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
		print(`[MinerClass] Spawning product: ${this.product.type} at ${position}`);
		return this.product.create(position);
	}

	spawnModel(position: Vector3 = new Vector3(0, 0, 0)): Model {
		print(`[MinerClass] Finding template: ${this.templateName}`);
		const template = ReplicatedStorage.FindFirstChild(this.templateName) as Model;
		if (!template) {
			error(`Template '${this.templateName}' not found in ReplicatedStorage`);
		}

		let spawnedModel: Model;
		print(`[MinerClass] Template found, cloning...`);
		spawnedModel = template.Clone() as Model;

		this.model = spawnedModel;
		print(`[MinerClass] Model created, positioning to: ${position}`);

		// Set PrimaryPart if not set
		if (!this.model.PrimaryPart) {
			print(`[MinerClass] Setting PrimaryPart...`);
			this.model.PrimaryPart = (this.model.FindFirstChildWhichIsA("BasePart") as BasePart);
		}

		// Use PivotTo for reliable positioning
		if (this.model.PrimaryPart) {
			this.model.PivotTo(new CFrame(position));
		} else {
			print(`[MinerClass] WARNING: No PrimaryPart found!`);
		}

		print(`[MinerClass] Setting parent to Workspace`);
		this.model.Parent = Workspace;
		print(`[MinerClass] Spawned successfully at ${position}`);

		return this.model;
	}

	spawn(position?: Vector3): Model {
		const finalPos = position ?? new Vector3(0, 0, 0);
		print(`[MinerClass.spawn] Called with position: ${finalPos}`);
		return this.spawnModel(finalPos);
	}

	startMining(): void {
		task.spawn(() => {
			while (true) {
				task.wait(this.getInterval());
				this.spawnProduct(this.getSpawnPosition());
			}
		});
	}
}
