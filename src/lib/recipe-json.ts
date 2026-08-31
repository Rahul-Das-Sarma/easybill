import { formatProductNameForDisplay } from "@/lib/product-name";
import {
  getRecipeStockStatus,
  type RecipeStockStatus,
} from "@/lib/recipe-stock-status";

export type RecipeComponentJson = {
  id: string;
  rawMaterialId: string;
  quantityPerUnit: number;
  rawMaterial: {
    id: string;
    name: string;
    sku: string | null;
    quantity: number;
    unitPrice: number;
  };
};

export function recipeToJson(r: {
  id: string;
  name: string;
  description: string | null;
  unitPrice?: { toString(): string };
  taxRate?: { toString(): string };
  outputProductId?: string | null;
  outputProduct?: {
    id: string;
    quantity: { toString(): string };
  } | null;
  createdAt: Date;
  updatedAt: Date;
  components?: {
    id: string;
    rawMaterialId: string;
    quantityPerUnit: { toString(): string };
    rawMaterial: {
      id: string;
      name: string;
      sku: string | null;
      quantity: { toString(): string };
      unitPrice: { toString(): string };
    };
  }[];
}) {
  const components = r.components?.map((c) => ({
    id: c.id,
    rawMaterialId: c.rawMaterialId,
    quantityPerUnit: Number(c.quantityPerUnit),
    rawMaterial: {
      id: c.rawMaterial.id,
      name: formatProductNameForDisplay(c.rawMaterial.name),
      sku: c.rawMaterial.sku,
      quantity: Number(c.rawMaterial.quantity),
      unitPrice: Number(c.rawMaterial.unitPrice),
    },
  }));

  const stockStatus: RecipeStockStatus | undefined = components
    ? getRecipeStockStatus(
        components.map((c) => ({
          rawMaterialId: c.rawMaterialId,
          name: c.rawMaterial.name,
          quantityPerUnit: c.quantityPerUnit,
          stock: c.rawMaterial.quantity,
        })),
      )
    : undefined;

  return {
    id: r.id,
    name: formatProductNameForDisplay(r.name),
    description: r.description,
    unitPrice: r.unitPrice ? Number(r.unitPrice) : 0,
    taxRate: r.taxRate ? Number(r.taxRate) : 18,
    outputProductId: r.outputProductId ?? null,
    outputStock: r.outputProduct ? Number(r.outputProduct.quantity) : 0,
    stockStatus,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    components,
  };
}

export type RecipeJson = ReturnType<typeof recipeToJson>;

export const recipeInclude = {
  components: {
    include: {
      rawMaterial: {
        select: {
          id: true,
          name: true,
          sku: true,
          quantity: true,
          unitPrice: true,
        },
      },
    },
    orderBy: { rawMaterial: { name: "asc" as const } },
  },
  outputProduct: {
    select: { id: true, quantity: true },
  },
} as const;
