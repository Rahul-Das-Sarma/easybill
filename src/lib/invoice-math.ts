/** GST line + header totals with pre-tax discount (flat INR or % of subtotal). */

export const GST_RATES = [0, 5, 12, 18, 28] as const;
export type GstRate = (typeof GST_RATES)[number];

export type LineDraft = {
  productName: string;
  quantity: number;
  unitPrice: number;
  taxRate: GstRate;
};

export type ComputedLine = LineDraft & {
  lineSubtotal: number;
  taxAmount: number;
  lineTotal: number;
  sortOrder: number;
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Lines with empty product or non-positive qty contribute 0 (keeps row alignment with the form). */
export function computeInvoiceLines(
  lines: LineDraft[],
  discountMode: "flat" | "percent",
  discountValue: number,
): {
  items: ComputedLine[];
  /** Taxable value after discount (sum of line bases post-scale). */
  subtotal: number;
  /** Pre-discount sum of qty × price (before GST). */
  preDiscountSubtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
} {
  const effective: LineDraft[] = lines.map((l, i) => {
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
    const taxAmount = round2(lineSubtotal * (l.taxRate / 100));
    const lineTotal = round2(lineSubtotal + taxAmount);
    return {
      ...l,
      lineSubtotal,
      taxAmount,
      lineTotal,
      sortOrder: i,
    };
  });

  const subtotal = round2(items.reduce((s, x) => s + x.lineSubtotal, 0));
  const taxAmount = round2(items.reduce((s, x) => s + x.taxAmount, 0));
  const totalAmount = round2(subtotal + taxAmount);

  return {
    items,
    subtotal,
    preDiscountSubtotal: rawSubtotal,
    discountAmount: discountInr,
    taxAmount,
    totalAmount,
  };
}
