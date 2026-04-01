import { MinerClass } from "./minerClass";
import { WoodCube } from "../products/woodCube";
import { MINING_CONFIG } from "shared/constants";

export class BaseMiner extends MinerClass {
	constructor(templateName = "BaseMiner", ownerUserId?: number) {
		super(new WoodCube(), templateName, ownerUserId);
	}

	getInterval(): number {
		return MINING_CONFIG.BASE_INTERVAL_SECONDS;
	}

	spawn(position?: Vector3): Model {
		const model = super.spawn(position);
		this.startMining();
		return model;
	}
}
