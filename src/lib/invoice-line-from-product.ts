import { GST_RATES } from "@/lib/invoice-math";
import type { ProductJson } from "@/lib/product-json";
import type { InvoiceCreateFormValues } from "@/lib/invoice-create-form-schema";

type GstRateOption = (typeof GST_RATES)[number];

function pickGstRateFromProduct(p: ProductJson): GstRateOption {
  const n = Number(p.taxRate);
  return GST_RATES.includes(n as GstRateOption) ? (n as GstRateOption) : 18;
}

export function lineFromProduct(
  p: ProductJson,
): InvoiceCreateFormValues["lines"][number] {
  return {
    productName: p.name,
    quantity: 1,
    unitPrice: p.unitPrice,
    taxRate: pickGstRateFromProduct(p),
  };
}
