import { Players, Workspace } from "@rbxts/services";
import { addCoins, getBalance } from "server/data";
import { getRemotes } from "shared/remotes";
import { SELL_ZONE_CONFIG } from "shared/constants";

const SELL_ZONE_NAME = "SellZone";
const PRODUCT_OWNER_ATTRIBUTE = "ProductOwnerUserId";
const PRODUCT_VALUE_ATTRIBUTE = "ProductValue";
const PRODUCT_SELLING_ATTRIBUTE = "ProductIsSelling";
const SELL_ZONE_GLOW_NAME = "SellZoneGlow";
const SELL_ZONE_DEEP_RED = Color3.fromRGB(120, 0, 0);

export class SellZone {
    remotes = getRemotes();

	constructor(private readonly zonePart: BasePart) {}

	bind(): RBXScriptConnection {
		return this.zonePart.Touched.Connect((hitPart) => this.trySellProduct(hitPart));
	}

	private trySellProduct(hitPart: BasePart): void {
		const productModel = hitPart.FindFirstAncestorOfClass("Model");
		if (!productModel) {
			return;
		}

		const isSelling = productModel.GetAttribute(PRODUCT_SELLING_ATTRIBUTE);
		if (typeIs(isSelling, "boolean") && isSelling) {
			return;
		}

		productModel.SetAttribute(PRODUCT_SELLING_ATTRIBUTE, true);

		const ownerUserId = this.getNumericAttribute(productModel, hitPart, PRODUCT_OWNER_ATTRIBUTE);
		const productValue = this.getNumericAttribute(productModel, hitPart, PRODUCT_VALUE_ATTRIBUTE);
		if (ownerUserId === undefined || productValue === undefined || productValue <= 0) {
			productModel.SetAttribute(PRODUCT_SELLING_ATTRIBUTE, false);
			return;
		}

		const owner = Players.GetPlayerByUserId(ownerUserId);
		if (!owner) {
			productModel.SetAttribute(PRODUCT_SELLING_ATTRIBUTE, false);
			return;
		}

		addCoins(owner, productValue);
		this.remotes.UpdateBalance.FireClient(owner, getBalance(owner));

		productModel.Destroy();
	}

	private getNumericAttribute(model: Model, touchedPart: BasePart, attributeName: string): number | undefined {
		const modelValue = model.GetAttribute(attributeName);
		if (typeIs(modelValue, "number")) {
			return modelValue;
		}

		const partValue = touchedPart.GetAttribute(attributeName);
		if (typeIs(partValue, "number")) {
			return partValue;
		}

		return undefined;
	}
}

function applySellZoneStyle(zonePart: BasePart): void {
	zonePart.Color = SELL_ZONE_DEEP_RED;
	zonePart.Material = Enum.Material.Neon;

	const existingGlow = zonePart.FindFirstChild(SELL_ZONE_GLOW_NAME);
	if (existingGlow && existingGlow.IsA("PointLight")) {
		existingGlow.Color = SELL_ZONE_DEEP_RED;
		existingGlow.Range = SELL_ZONE_CONFIG.glowRange;
		existingGlow.Brightness = SELL_ZONE_CONFIG.glowBrightness;
		return;
	}

	const glow = new Instance("PointLight");
	glow.Name = SELL_ZONE_GLOW_NAME;
	glow.Color = SELL_ZONE_DEEP_RED;
	glow.Range = SELL_ZONE_CONFIG.glowRange;
	glow.Brightness = SELL_ZONE_CONFIG.glowBrightness;
	glow.Parent = zonePart;
}

export function initializeSellZones(): void {
	const activeZones = new Set<BasePart>();

	const bindZone = (instance: Instance) => {
		if (!instance.IsA("BasePart") || instance.Name !== SELL_ZONE_NAME || activeZones.has(instance)) {
			return;
		}

		applySellZoneStyle(instance);

		activeZones.add(instance);
		const sellZone = new SellZone(instance);
		const connection = sellZone.bind();

		instance.Destroying.Connect(() => {
			connection.Disconnect();
			activeZones.delete(instance);
		});
	};

	for (const descendant of Workspace.GetDescendants()) {
		bindZone(descendant);
	}

	Workspace.DescendantAdded.Connect((instance) => bindZone(instance));
}
