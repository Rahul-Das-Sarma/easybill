import { formatProductNameForDisplay } from "@/lib/product-name";

/** JSON-safe product shape for API responses (Decimals → numbers). */
export function productToJson(p: {
  id: string;
  userId: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  description: string | null;
  kind?: "finished_good" | "raw_material";
  recipeId?: string | null;
  recipe?: { id: string; name: string } | null;
  quantity: { toString(): string };
  unitPrice: { toString(): string };
  taxRate: { toString(): string };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: p.id,
    userId: p.userId,
    name: formatProductNameForDisplay(p.name),
    sku: p.sku,
    barcode: p.barcode,
    description: p.description,
    kind: p.kind ?? "finished_good",
    recipeId: p.recipeId ?? null,
    recipe: p.recipe
      ? { id: p.recipe.id, name: p.recipe.name }
      : null,
    quantity: Number(p.quantity),
    unitPrice: Number(p.unitPrice),
    taxRate: Number(p.taxRate),
    isActive: p.isActive,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

export type ProductJson = ReturnType<typeof productToJson>;
