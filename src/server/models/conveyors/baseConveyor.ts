import { ConveyorClass } from "server/models/conveyors/conveyorClass";
import { CONVEYOR_CONFIG } from "shared/constants";

export class BaseConveyor extends ConveyorClass {
	constructor(templateName = "Conveyor") {
		super(templateName);
	}

	getSpeed(): number {
		return CONVEYOR_CONFIG.baseSpeed;
	}
}
