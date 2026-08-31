export type RecipeComponentStock = {
  rawMaterialId: string;
  name: string;
  quantityPerUnit: number;
  stock: number;
};

export type RecipeStockStatus = {
  canProduceOne: boolean;
  maxProducible: number;
  shortages: { name: string; need: number; have: number }[];
};

/** How many units can be produced with current raw material stock. */
export function getRecipeStockStatus(
  components: RecipeComponentStock[],
): RecipeStockStatus {
  if (components.length === 0) {
    return { canProduceOne: false, maxProducible: 0, shortages: [] };
  }

  const shortages: RecipeStockStatus["shortages"] = [];
  let maxProducible = Number.POSITIVE_INFINITY;

  for (const line of components) {
    const perUnit = line.quantityPerUnit;
    if (perUnit <= 0) continue;

    const maxForLine = line.stock / perUnit;
    if (maxForLine < maxProducible) maxProducible = maxForLine;

    if (line.stock + 1e-9 < perUnit) {
      shortages.push({
        name: line.name,
        need: perUnit,
        have: line.stock,
      });
    }
  }

  if (!Number.isFinite(maxProducible)) maxProducible = 0;

  const floored = Math.floor(maxProducible * 10000) / 10000;

  return {
    canProduceOne: floored >= 1,
    maxProducible: floored,
    shortages,
  };
}
