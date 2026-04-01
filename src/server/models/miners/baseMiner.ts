import { MinerClass } from "./minerClass";
import { WoodCube } from "../products/woodCube";

export class BaseMiner extends MinerClass {
	constructor(templateName = "BaseMiner", ownerUserId?: number) {
		super(new WoodCube(), templateName, ownerUserId);
	}

	getInterval(): number {
		return 5;
	}

	spawn(position?: Vector3): Model {
		const model = super.spawn(position);
		this.startMining();
		return model;
	}
}
