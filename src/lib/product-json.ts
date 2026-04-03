import { formatProductNameForDisplay } from "@/lib/product-name";

/** JSON-safe product shape for API responses (Decimals → numbers). */
export function productToJson(p: {
  id: string;
  userId: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  description: string | null;
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
    quantity: Number(p.quantity),
    unitPrice: Number(p.unitPrice),
    taxRate: Number(p.taxRate),
    isActive: p.isActive,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

export type ProductJson = ReturnType<typeof productToJson>;
