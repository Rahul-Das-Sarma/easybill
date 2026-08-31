import { prisma } from "@/lib/prisma";

export type ResolvedBomLine = {
  rawMaterialId: string;
  quantityPerUnit: number;
  rawMaterial: {
    id: string;
    name: string;
    quantity: number;
  };
};

export type ResolvedBom = {
  source: "recipe" | "legacy_bom";
  recipeId: string | null;
  lines: ResolvedBomLine[];
};

/** Resolve production formula from assigned recipe, or legacy per-product BOM. */
export async function resolveProductBom(
  userId: string,
  finishedGoodId: string,
): Promise<ResolvedBom | null> {
  const product = await prisma.product.findFirst({
    where: {
      id: finishedGoodId,
      userId,
      kind: "finished_good",
    },
    select: { recipeId: true },
  });

  if (!product) return null;

  if (product.recipeId) {
    const components = await prisma.recipeComponent.findMany({
      where: { recipeId: product.recipeId },
      include: {
        rawMaterial: {
          select: { id: true, name: true, quantity: true },
        },
      },
      orderBy: { rawMaterial: { name: "asc" } },
    });

    return {
      source: "recipe",
      recipeId: product.recipeId,
      lines: components.map((c) => ({
        rawMaterialId: c.rawMaterialId,
        quantityPerUnit: Number(c.quantityPerUnit),
        rawMaterial: {
          id: c.rawMaterial.id,
          name: c.rawMaterial.name,
          quantity: Number(c.rawMaterial.quantity),
        },
      })),
    };
  }

  const bom = await prisma.bomComponent.findMany({
    where: { userId, finishedGoodId },
    include: {
      rawMaterial: {
        select: { id: true, name: true, quantity: true },
      },
    },
    orderBy: { rawMaterial: { name: "asc" } },
  });

  if (bom.length === 0) return null;

  return {
    source: "legacy_bom",
    recipeId: null,
    lines: bom.map((line) => ({
      rawMaterialId: line.rawMaterialId,
      quantityPerUnit: Number(line.quantityPerUnit),
      rawMaterial: {
        id: line.rawMaterial.id,
        name: line.rawMaterial.name,
        quantity: Number(line.rawMaterial.quantity),
      },
    })),
  };
}
