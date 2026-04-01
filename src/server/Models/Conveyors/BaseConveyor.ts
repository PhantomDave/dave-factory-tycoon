import { ConveyorClass } from "./ConveyorClass";

export class BaseConveyor extends ConveyorClass {
	constructor(templateName = "Conveyor") {
		super(templateName);
	}

	getSpeed(): number {
		return 1; // Studs per second
	}
}
