import { MinerClass } from "./MinerClass";
import { WoodCube } from "../Products/WoodCube";

export class BaseMiner extends MinerClass {
	constructor(templateName: string = "BaseMiner") {
		super(templateName, new WoodCube());
		this.startMining();
	}

	getInterval(): number {
		return 5;
	}
}
