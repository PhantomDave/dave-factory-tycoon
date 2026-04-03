import { RunService, Workspace } from "@rbxts/services";
import { ITEM_MOVEMENT_ID_ATTRIBUTE } from "shared/constants";
import { getRemotes } from "shared/remotes";
import type { ItemMovementSnapshot } from "shared/types";

interface ClientItemState extends ItemMovementSnapshot {
	model?: Model;
}

const trackedItems = new Map<string, ClientItemState>();
let initialized = false;

function findTrackedModel(itemId: string): Model | undefined {
	for (const descendant of Workspace.GetDescendants()) {
		if (!descendant.IsA("Model")) {
			continue;
		}

		const trackedItemId = descendant.GetAttribute(ITEM_MOVEMENT_ID_ATTRIBUTE);
		if (typeIs(trackedItemId, "string") && trackedItemId === itemId) {
			return descendant;
		}
	}

	return undefined;
}

function updateTrackedItem(update: ItemMovementSnapshot): void {
	const existing = trackedItems.get(update.itemId);
	trackedItems.set(update.itemId, {
		...update,
		model: existing?.model,
	});
}

function renderTrackedItems(): void {
	const now = Workspace.GetServerTimeNow();

	for (const [itemId, trackedItem] of trackedItems) {
		const model = trackedItem.model ?? findTrackedModel(itemId);
		if (!model) {
			continue;
		}

		if (!model.Parent) {
			trackedItems.delete(itemId);
			continue;
		}

		trackedItem.model = model;

		const elapsed = math.max(0, now - trackedItem.timestamp);
		const nextPosition = trackedItem.startPosition.add(trackedItem.velocity.mul(elapsed));
		const currentPivot = model.GetPivot();
		model.PivotTo(new CFrame(nextPosition).mul(currentPivot.Rotation));
	}
}

export function initializeItemMovementController(): void {
	if (initialized) {
		return;
	}

	initialized = true;

	getRemotes().ItemMovement.OnClientEvent.Connect((updates: ItemMovementSnapshot[]) => {
		for (const update of updates) {
			updateTrackedItem(update);
		}
	});

	RunService.PreRender.Connect(() => {
		renderTrackedItems();
	});
}
