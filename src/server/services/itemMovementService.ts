import { Workspace } from "@rbxts/services";
import { ITEM_MOVEMENT_CONFIG, ITEM_MOVEMENT_ID_ATTRIBUTE } from "shared/constants";
import { getRemotes } from "shared/remotes";
import type { ItemMovementSnapshot } from "shared/types";

interface TrackedItemRecord {
	model: Model;
	lastVelocity: Vector3;
}

const trackedItems = new Map<string, TrackedItemRecord>();
let nextItemId = 0;
let syncLoopStarted = false;

function getPrimaryPart(itemModel: Model): BasePart | undefined {
	const primaryPart = itemModel.PrimaryPart ?? (itemModel.FindFirstChildWhichIsA("BasePart") as BasePart | undefined);
	if (primaryPart && itemModel.PrimaryPart !== primaryPart) {
		itemModel.PrimaryPart = primaryPart;
	}

	return primaryPart;
}

function createItemId(): string {
	nextItemId += 1;
	return `item_${nextItemId}`;
}

function getOrAssignItemId(itemModel: Model): string {
	const existingItemId = itemModel.GetAttribute(ITEM_MOVEMENT_ID_ATTRIBUTE);
	if (typeIs(existingItemId, "string") && existingItemId.size() > 0) {
		return existingItemId;
	}

	const itemId = createItemId();
	itemModel.SetAttribute(ITEM_MOVEMENT_ID_ATTRIBUTE, itemId);

	const primaryPart = getPrimaryPart(itemModel);
	if (primaryPart) {
		primaryPart.SetAttribute(ITEM_MOVEMENT_ID_ATTRIBUTE, itemId);
	}

	return itemId;
}

function ensureTrackedItem(itemModel: Model): string {
	const itemId = getOrAssignItemId(itemModel);
	const existing = trackedItems.get(itemId);
	if (existing) {
		existing.model = itemModel;
		return itemId;
	}

	trackedItems.set(itemId, {
		model: itemModel,
		lastVelocity: new Vector3(0, 0, 0),
	});

	itemModel.Destroying.Connect(() => {
		unregisterTrackedItem(itemModel);
	});

	startItemMovementSyncLoop();
	return itemId;
}

function createSnapshot(itemId: string, itemModel: Model): ItemMovementSnapshot | undefined {
	if (!itemModel.Parent) {
		return undefined;
	}

	const primaryPart = getPrimaryPart(itemModel);
	if (!primaryPart) {
		return undefined;
	}

	primaryPart.SetAttribute(ITEM_MOVEMENT_ID_ATTRIBUTE, itemId);

	return {
		itemId,
		startPosition: primaryPart.Position,
		velocity: primaryPart.AssemblyLinearVelocity,
		timestamp: Workspace.GetServerTimeNow(),
	};
}

function broadcastSnapshots(snapshots: ItemMovementSnapshot[]): void {
	if (snapshots.size() === 0) {
		return;
	}

	getRemotes().ItemMovement.FireAllClients(snapshots);
}

function startItemMovementSyncLoop(): void {
	if (syncLoopStarted) {
		return;
	}

	syncLoopStarted = true;

	task.spawn(() => {
		while (true) {
			task.wait(ITEM_MOVEMENT_CONFIG.syncInterval);

			if (trackedItems.size() === 0) {
				continue;
			}

			const snapshots = new Array<ItemMovementSnapshot>();
			for (const [itemId, trackedItem] of trackedItems) {
				const snapshot = createSnapshot(itemId, trackedItem.model);
				if (!snapshot) {
					trackedItems.delete(itemId);
					continue;
				}

				trackedItem.lastVelocity = snapshot.velocity;
				snapshots.push(snapshot);
			}

			broadcastSnapshots(snapshots);
		}
	});
}

export function registerTrackedItem(itemModel: Model): string {
	const itemId = ensureTrackedItem(itemModel);
	syncTrackedItem(itemModel);
	return itemId;
}

export function syncTrackedItem(itemModel: Model): void {
	const itemId = ensureTrackedItem(itemModel);
	const trackedItem = trackedItems.get(itemId);
	if (!trackedItem) {
		return;
	}

	const snapshot = createSnapshot(itemId, trackedItem.model);
	if (!snapshot) {
		trackedItems.delete(itemId);
		return;
	}

	trackedItem.lastVelocity = snapshot.velocity;
	broadcastSnapshots([snapshot]);
}

export function setTrackedItemVelocity(itemModel: Model, velocity: Vector3): void {
	const primaryPart = getPrimaryPart(itemModel);
	if (!primaryPart) {
		return;
	}

	primaryPart.AssemblyLinearVelocity = velocity;

	const itemId = ensureTrackedItem(itemModel);
	const trackedItem = trackedItems.get(itemId);
	if (!trackedItem) {
		return;
	}

	if (trackedItem.lastVelocity.sub(velocity).Magnitude > 0.01) {
		syncTrackedItem(itemModel);
	}
}

export function unregisterTrackedItem(itemModel: Model): void {
	const existingItemId = itemModel.GetAttribute(ITEM_MOVEMENT_ID_ATTRIBUTE);
	if (!typeIs(existingItemId, "string") || existingItemId.size() === 0) {
		return;
	}

	trackedItems.delete(existingItemId);
}
