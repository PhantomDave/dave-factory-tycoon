import { spawnTemplateModel } from "server/models/spawnUtils";
import { setTrackedItemVelocity } from "server/services/itemMovementService";
import { logger } from "server/utils/logger";
import { CONVEYOR_CONFIG } from "shared/constants";

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

	spawnModel(cframe: CFrame, parent: Instance): Model {
		const spawnedModel = spawnTemplateModel(this.templateName, cframe, parent);
		this.model = spawnedModel;
		return this.model;
	}

	spawn(cframe: CFrame, parent: Instance): void {
		this.spawnModel(cframe, parent);
		this.startTransporting();
	}

	startTransporting(): void {
		const conveyorSurface = this.getConveyorSurface();
		if (!conveyorSurface) {
			logger.warn(`Conveyor '${this.templateName}' has no BasePart to transport items on`);
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
				const humanoidRootPart = (part.Parent as Model)?.FindFirstChild("HumanoidRootPart") as
					| BasePart
					| undefined;
				const bodyPart = humanoidRootPart ?? part;

				// Transport the item along the conveyor
				while (this.model.Parent && bodyPart.Parent && this.transportedItems.has(part)) {
					const moveDirection = conveyorSurface.CFrame.LookVector;
					const conveyorVelocity = moveDirection.mul(this.getSpeed());
					const itemModel = bodyPart.FindFirstAncestorOfClass("Model");

					if (itemModel) {
						setTrackedItemVelocity(itemModel, conveyorVelocity);
					} else {
						bodyPart.AssemblyLinearVelocity = conveyorVelocity;
					}

					task.wait(CONVEYOR_CONFIG.updateInterval); // ~60 FPS
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
