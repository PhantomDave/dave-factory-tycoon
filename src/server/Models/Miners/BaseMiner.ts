import { MinerClass } from "./MinerClass";
import { WoodCube } from "../Products/WoodCube";

export class BaseMiner extends MinerClass {
	constructor(templateName = "BaseMiner") {
		super(new WoodCube(), templateName);
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
