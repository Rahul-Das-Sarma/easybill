import { Prisma } from "@/generated/prisma/client";

import { normalizeProductNameForStorage } from "@/lib/product-name";

type Tx = Pick<
  Prisma.TransactionClient,
  "product" | "recipe"
>;

/** Create or update the finished-good inventory row for a recipe. */
export async function syncRecipeOutputProduct(
  tx: Tx,
  userId: string,
  recipe: {
    id: string;
    name: string;
    outputProductId: string | null;
    unitPrice: Prisma.Decimal;
    taxRate: Prisma.Decimal;
  },
) {
  const name = normalizeProductNameForStorage(recipe.name);

  if (recipe.outputProductId) {
    await tx.product.update({
      where: { id: recipe.outputProductId },
      data: {
        name,
        unitPrice: recipe.unitPrice,
        taxRate: recipe.taxRate,
        recipeId: recipe.id,
        kind: "finished_good",
        isActive: true,
      },
    });
    return recipe.outputProductId;
  }

  const product = await tx.product.create({
    data: {
      userId,
      name,
      kind: "finished_good",
      quantity: new Prisma.Decimal(0),
      unitPrice: recipe.unitPrice,
      taxRate: recipe.taxRate,
      recipeId: recipe.id,
      isActive: true,
    },
  });

  await tx.recipe.update({
    where: { id: recipe.id },
    data: { outputProductId: product.id },
  });

  return product.id;
}
