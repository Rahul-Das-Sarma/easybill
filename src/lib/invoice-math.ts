/** GST line + header totals with pre-tax discount (flat INR or % of subtotal). */

import type { GstScheme, SupplyType } from "@/lib/gst-india";

export const GST_RATES = [0, 5, 12, 18, 28] as const;
export type GstRate = (typeof GST_RATES)[number];

export type LineDraft = {
  productName: string;
  quantity: number;
  unitPrice: number;
  taxRate: GstRate;
};

export type InvoiceTaxContext = {
  gstScheme: GstScheme;
  supplyType?: SupplyType;
};

export type ComputedLine = LineDraft & {
  lineSubtotal: number;
  taxAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  lineTotal: number;
  sortOrder: number;
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function splitTax(
  taxAmount: number,
  gstScheme: GstScheme,
  supplyType: SupplyType,
): { cgst: number; sgst: number; igst: number } {
  if (gstScheme !== "regular" || taxAmount <= 0) {
    return { cgst: 0, sgst: 0, igst: 0 };
  }
  if (supplyType === "inter") {
    return { cgst: 0, sgst: 0, igst: taxAmount };
  }
  const half = round2(taxAmount / 2);
  const other = round2(taxAmount - half);
  return { cgst: half, sgst: other, igst: 0 };
}

/** Lines with empty product or non-positive qty contribute 0 (keeps row alignment with the form). */
export function computeInvoiceLines(
  lines: LineDraft[],
  discountMode: "flat" | "percent",
  discountValue: number,
  taxContext: InvoiceTaxContext = { gstScheme: "regular", supplyType: "intra" },
): {
  items: ComputedLine[];
  /** Taxable value after discount (sum of line bases post-scale). */
  subtotal: number;
  /** Pre-discount sum of qty × price (before GST). */
  preDiscountSubtotal: number;
  discountAmount: number;
  taxAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalAmount: number;
  gstScheme: GstScheme;
  supplyType: SupplyType;
} {
  const gstScheme = taxContext.gstScheme;
  const supplyType =
    gstScheme === "regular"
      ? (taxContext.supplyType ?? "intra")
      : "none";

  const effective: LineDraft[] = lines.map((l) => {
    const name = l.productName.trim();
    const qty = name.length > 0 && l.quantity > 0 ? l.quantity : 0;
    const rate = GST_RATES.includes(l.taxRate as GstRate)
      ? l.taxRate
      : (18 as GstRate);
    return {
      productName: name,
      quantity: qty,
      unitPrice: Math.max(0, l.unitPrice),
      taxRate: rate,
    };
  });

  const rawBases = effective.map((l) => round2(l.quantity * l.unitPrice));
  const rawSubtotal = round2(rawBases.reduce((a, b) => a + b, 0));

  let discountInr = 0;
  if (discountMode === "flat") {
    discountInr = round2(Math.max(0, Math.min(discountValue, rawSubtotal)));
  } else {
    const p = Math.max(0, Math.min(100, discountValue));
    discountInr = round2(rawSubtotal * (p / 100));
  }

  const netSubtotal = round2(Math.max(0, rawSubtotal - discountInr));
  const factor = rawSubtotal > 0 ? netSubtotal / rawSubtotal : 0;

  const items: ComputedLine[] = effective.map((l, i) => {
    const origBase = rawBases[i]!;
    const lineSubtotal = round2(origBase * factor);
    const taxAmount =
      gstScheme === "regular"
        ? round2(lineSubtotal * (l.taxRate / 100))
        : 0;
    const { cgst, sgst, igst } = splitTax(taxAmount, gstScheme, supplyType);
    const lineTotal = round2(lineSubtotal + taxAmount);
    return {
      ...l,
      lineSubtotal,
      taxAmount,
      cgstAmount: cgst,
      sgstAmount: sgst,
      igstAmount: igst,
      lineTotal,
      sortOrder: i,
    };
  });

  const subtotal = round2(items.reduce((s, x) => s + x.lineSubtotal, 0));
  const taxAmount = round2(items.reduce((s, x) => s + x.taxAmount, 0));
  const cgstAmount = round2(items.reduce((s, x) => s + x.cgstAmount, 0));
  const sgstAmount = round2(items.reduce((s, x) => s + x.sgstAmount, 0));
  const igstAmount = round2(items.reduce((s, x) => s + x.igstAmount, 0));
  const totalAmount = round2(subtotal + taxAmount);

  return {
    items,
    subtotal,
    preDiscountSubtotal: rawSubtotal,
    discountAmount: discountInr,
    taxAmount,
    cgstAmount,
    sgstAmount,
    igstAmount,
    totalAmount,
    gstScheme,
    supplyType,
  };
}
