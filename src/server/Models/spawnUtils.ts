import { ReplicatedStorage, Workspace } from "@rbxts/services";

const DEFAULT_SPAWN_POSITION = new Vector3(0, 0, 0);

export function getPlayerSpawnPosition(player: Player, fallback = DEFAULT_SPAWN_POSITION): Vector3 {
	const primaryPart = player.Character?.PrimaryPart;
	return primaryPart ? primaryPart.Position : fallback;
}

export function spawnTemplateModel(templateName: string, position: Vector3 = DEFAULT_SPAWN_POSITION): Model {
	const template = ReplicatedStorage.FindFirstChild(templateName);
	if (!template || (!template.IsA("Model") && !template.IsA("BasePart"))) {
		error(`Template '${templateName}' not found in ReplicatedStorage or is not a Model/Part`);
	}

	let spawnedModel: Model;
	if (template.IsA("Model")) {
		spawnedModel = template.Clone();
	} else {
		const wrappedPart = template.Clone() as BasePart;
		spawnedModel = new Instance("Model");
		spawnedModel.Name = templateName;
		wrappedPart.Parent = spawnedModel;
	}

	if (!spawnedModel.PrimaryPart) {
		spawnedModel.PrimaryPart = spawnedModel.FindFirstChildWhichIsA("BasePart") as BasePart;
	}

	if (spawnedModel.PrimaryPart) {
		spawnedModel.PivotTo(new CFrame(position));
	}

	spawnedModel.Parent = Workspace;
	return spawnedModel;
}