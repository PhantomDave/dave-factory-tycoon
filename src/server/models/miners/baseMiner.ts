import { registerSpawner } from "server/factory";
import { MinerClass } from "server/models/miners/minerClass";
import { WoodCube } from "server/models/products/woodCube";
import { MINING_CONFIG } from "shared/constants";
import { MachineSize } from "shared/types";

export class BaseMiner extends MinerClass {
	static readonly size: MachineSize = { width: 2, height: 2 };

	constructor(templateName = "BaseMiner", ownerUserId?: number) {
		super(new WoodCube(), templateName, ownerUserId);
	}

	getInterval(): number {
		return MINING_CONFIG.BASE_INTERVAL_SECONDS;
	}

	spawn(cframe: CFrame, parent: Instance): void {
		super.spawn(cframe, parent);
		this.startMining();
	}
}

registerSpawner("BaseMiner", (player, cframe, plotFolder) => {
	const miner = new BaseMiner("BaseMiner", player.UserId);
	miner.dropSide = "front";
	miner.spawn(cframe, plotFolder);
	return miner.model;
});
