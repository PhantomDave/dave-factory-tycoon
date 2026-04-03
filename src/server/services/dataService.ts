import { DataStoreService } from "@rbxts/services";
import type { MachineData } from "shared/types";
import { logger } from "server/utils/logger";

interface SavedData {
	coins: number;
	multiplier: number;
	unlockedUpgrades: string[];
	machines: MachineData[];
}

const store = DataStoreService.GetDataStore("PlayerData_v1");

function playerKey(userId: number): string {
	return `player_${userId}`;
}

export function loadData(userId: number): SavedData | undefined {
	try {
		const [value] = store.GetAsync(playerKey(userId));
		return value as SavedData | undefined;
	} catch (e) {
		logger.warn(`DataStore load failed for ${userId}: ${tostring(e)}`);
		return undefined;
	}
}

export function saveData(
	userId: number,
	coins: number,
	multiplier: number,
	unlockedUpgrades: string[],
	machines: MachineData[],
): void {
	const payload: SavedData = { coins, multiplier, unlockedUpgrades, machines };
	try {
		store.SetAsync(playerKey(userId), payload);
	} catch (e) {
		logger.warn(`DataStore save failed for ${userId}: ${tostring(e)}`);
	}
}

export function deleteData(userId: number): boolean {
	try {
		store.RemoveAsync(playerKey(userId));
		return true;
	} catch (e) {
		logger.warn(`DataStore delete failed for ${userId}: ${tostring(e)}`);
		return false;
	}
}
