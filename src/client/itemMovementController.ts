import { RunService, Workspace } from "@rbxts/services";
import { ITEM_MOVEMENT_ID_ATTRIBUTE } from "shared/constants";
import { getRemotes } from "shared/remotes";
import type { ItemMovementSnapshot } from "shared/types";

interface ClientItemState extends ItemMovementSnapshot {
	model?: Model; // server-authoritative model reference if present
	visual?: Model; // client-only visual clone used for interpolation
	receivedAt: number; // server timestamp when we first received this id
}

const trackedItems = new Map<string, ClientItemState>();
const UNRESOLVED_TIMEOUT = 5; // seconds before we drop unresolved item entries
let initialized = false;

function createClientVisual(serverModel: Model): Model {
	// Clone server model for client-only visuals and make parts non-collidable/anchored.
	const visual = serverModel.Clone() as Model;
	visual.Name = `${serverModel.Name}_clientVisual`;

	for (const desc of visual.GetDescendants()) {
		if (desc.IsA("BasePart")) {
			const part = desc as BasePart;
			part.CanCollide = false;
			part.Anchored = true;
			part.SetAttribute("ClientVisual", true);
		}

		// Remove any runtime scripts to avoid unexpected behavior in the clone
		if (desc.IsA("Script") || desc.IsA("LocalScript") || desc.IsA("ModuleScript")) {
			desc.Destroy();
		}
	}

	visual.Parent = Workspace;
	return visual;
}

function indexExistingModels(): void {
	for (const descendant of Workspace.GetDescendants()) {
		if (!descendant.IsA("Model")) continue;
		const trackedItemId = descendant.GetAttribute(ITEM_MOVEMENT_ID_ATTRIBUTE);
		if (typeIs(trackedItemId, "string") && trackedItemId.size() > 0) {
			const state = trackedItems.get(trackedItemId);
			if (state) {
				state.model = descendant as Model;
				if (!state.visual) {
					state.visual = createClientVisual(state.model);
				}
			}
		}
	}
}

function onDescendantAdded(descendant: Instance): void {
	if (!descendant.IsA("Model")) return;
	const trackedItemId = descendant.GetAttribute(ITEM_MOVEMENT_ID_ATTRIBUTE);
	if (!typeIs(trackedItemId, "string") || trackedItemId.size() === 0) return;

	const state = trackedItems.get(trackedItemId);
	if (state) {
		state.model = descendant as Model;
		if (!state.visual) {
			state.visual = createClientVisual(state.model);
		}
	}
}

function onDescendantRemoving(descendant: Instance): void {
	if (!descendant.IsA("Model")) return;
	const trackedItemId = descendant.GetAttribute(ITEM_MOVEMENT_ID_ATTRIBUTE);
	if (!typeIs(trackedItemId, "string") || trackedItemId.size() === 0) return;

	const state = trackedItems.get(trackedItemId);
	if (!state) return;

	// Server model was removed; remove client visual and tracked state
	if (state.visual) {
		state.visual.Destroy();
	}

	trackedItems.delete(trackedItemId);
}

function updateTrackedItem(update: ItemMovementSnapshot): void {
	const existing = trackedItems.get(update.itemId);
	const now = Workspace.GetServerTimeNow();
	trackedItems.set(update.itemId, {
		...update,
		model: existing?.model,
		visual: existing?.visual,
		receivedAt: existing?.receivedAt ?? now,
	});
}

function renderTrackedItems(): void {
	const now = Workspace.GetServerTimeNow();

	for (const [itemId, trackedItem] of trackedItems) {
		// Cleanup unresolved entries after timeout
		if (!trackedItem.model && now - trackedItem.receivedAt > UNRESOLVED_TIMEOUT) {
			trackedItems.delete(itemId);
			continue;
		}

		const elapsed = math.max(0, now - trackedItem.timestamp);
		const nextPosition = trackedItem.startPosition.add(trackedItem.velocity.mul(elapsed));

		if (trackedItem.visual) {
			const currentPivot = trackedItem.visual.GetPivot();
			trackedItem.visual.PivotTo(new CFrame(nextPosition).mul(currentPivot.Rotation));
		} else if (trackedItem.model) {
			// If we have the server model but no visual clone yet, create one now
			trackedItem.visual = createClientVisual(trackedItem.model);
		}
	}
}

export function initializeItemMovementController(): void {
	if (initialized) {
		return;
	}

	initialized = true;

	// Index existing models once and subscribe to changes rather than scanning every frame
	indexExistingModels();
	Workspace.DescendantAdded.Connect(onDescendantAdded);
	Workspace.DescendantRemoving.Connect(onDescendantRemoving);

	getRemotes().ItemMovement.OnClientEvent.Connect((updates: ItemMovementSnapshot[]) => {
		for (const update of updates) {
			updateTrackedItem(update);
		}
	});

	RunService.PreRender.Connect(() => {
		renderTrackedItems();
	});
}
