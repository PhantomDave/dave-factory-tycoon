import { ReplicatedStorage, Workspace } from "@rbxts/services";

export abstract class ConveyorClass {
	model: Model;
	templateName: string;
	transportedItems: Map<Instance, boolean>;

	constructor(templateName = "BaseConveyor") {
		this.templateName = templateName;
		this.model = new Instance("Model");
		this.transportedItems = new Map();
	}

	abstract getSpeed(): number;

	getConveyorSurface(): BasePart | undefined {
		return this.model.FindFirstChildWhichIsA("BasePart") as BasePart | undefined;
	}

	spawnModel(position: Vector3 = new Vector3(0, 0, 0)): Model {
		const template = ReplicatedStorage.FindFirstChild(this.templateName);
		if (!template || (!template.IsA("Model") && !template.IsA("BasePart"))) {
			error(`Template '${this.templateName}' not found in ReplicatedStorage or is not a Model/Part`);
		}

		let spawnedModel: Model;

		if (template.IsA("Model")) {
			spawnedModel = template.Clone();
		} else {
			// If template is a Part, wrap it in a Model
			const part = template.Clone() as BasePart;
			spawnedModel = new Instance("Model");
			spawnedModel.Name = this.templateName;
			part.Parent = spawnedModel;
		}

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
		const model = this.spawnModel(finalPos);
		this.startTransporting();
		return model;
	}

	startTransporting(): void {
		const conveyorSurface = this.getConveyorSurface();
		if (!conveyorSurface) {
			warn(`Conveyor '${this.templateName}' has no BasePart to transport items on`);
			return;
		}

		const touchConnection = conveyorSurface.Touched.Connect((part: BasePart) => {
			if (!this.model.Parent || !conveyorSurface.Parent) {
				touchConnection.Disconnect();
				return;
			}

			// Only transport items not already being transported
			if (this.transportedItems.has(part)) {
				return;
			}

			this.transportedItems.set(part, true);

			task.spawn(() => {
				const humanoidRootPart = (part.Parent as Model)?.FindFirstChild("HumanoidRootPart") as BasePart | undefined;
				const bodyPart = humanoidRootPart ?? part;

				// Transport the item along the conveyor
				while (this.model.Parent && bodyPart.Parent && this.transportedItems.has(part)) {
					const moveDirection = conveyorSurface.CFrame.LookVector;
					bodyPart.AssemblyLinearVelocity = moveDirection.mul(this.getSpeed());

					task.wait(0.016); // ~60 FPS
				}

				this.transportedItems.delete(part);
			});
		});

		// Cleanup when conveyor is destroyed
		task.spawn(() => {
			while (this.model.Parent) {
				task.wait(1);
			}
			touchConnection.Disconnect();
			this.transportedItems.clear();
		});
	}
}
