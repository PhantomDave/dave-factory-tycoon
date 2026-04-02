import { ConveyorClass } from "server/models/conveyors/conveyorClass";
import { CONVEYOR_CONFIG } from "shared/constants";
import { MachineSize } from "shared/types";

export class BaseConveyor extends ConveyorClass {
	static readonly size: MachineSize = { width: 1, height: 1 };

	constructor(templateName = "Conveyor") {
		super(templateName);
	}

	getSpeed(): number {
		return CONVEYOR_CONFIG.baseSpeed;
	}
}
