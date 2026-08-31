import { formatProductNameForDisplay } from "@/lib/product-name";
import {
  getRecipeStockStatus,
  type RecipeComponentStock,
} from "@/lib/recipe-stock-status";

export type ProductionBomLine = {
  rawMaterialId: string;
  quantityPerUnit: number;
  rawMaterial: {
    name: string;
    quantity: number;
  };
};

export type MaterialShortage = {
  name: string;
  need: number;
  have: number;
};

/** Raw material gaps for producing `quantity` units of a finished good. */
export function getProductionShortages(
  lines: ProductionBomLine[],
  quantity: number,
): MaterialShortage[] {
  if (quantity <= 0) return [];

  const shortages: MaterialShortage[] = [];
  for (const line of lines) {
    const need = line.quantityPerUnit * quantity;
    const have = line.rawMaterial.quantity;
    if (have + 1e-9 < need) {
      shortages.push({
        name: formatProductNameForDisplay(line.rawMaterial.name),
        need,
        have,
      });
    }
  }
  return shortages;
}

/** Highest on-hand quantity allowed for a recipe-managed finished good. */
export function maxFinishedGoodQuantity(
  currentQuantity: number,
  components: RecipeComponentStock[],
): number {
  const { maxProducible } = getRecipeStockStatus(components);
  return Math.floor((currentQuantity + maxProducible) * 10000) / 10000;
}

export function bomLinesToRecipeComponents(
  lines: ProductionBomLine[],
): RecipeComponentStock[] {
  return lines.map((line) => ({
    rawMaterialId: line.rawMaterialId,
    name: line.rawMaterial.name,
    quantityPerUnit: line.quantityPerUnit,
    stock: line.rawMaterial.quantity,
  }));
}
