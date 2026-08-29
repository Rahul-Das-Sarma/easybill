import { Prisma } from "@/generated/prisma/client";

import { resolveSupplyType, stateCodeFromGstin } from "@/lib/gst-india";
import type { InvoiceMutationBody } from "@/lib/invoice-mutation-schema";
import { computeInvoiceLines } from "@/lib/invoice-math";
import { prisma } from "@/lib/prisma";

export async function buildInvoiceTotals(
  userId: string,
  body: InvoiceMutationBody,
) {
  const seller = await prisma.user.findUnique({
    where: { id: userId },
    select: { gstScheme: true, stateCode: true, gstNumber: true },
  });
  const gstScheme = seller?.gstScheme ?? "regular";

  const customer = await prisma.customer.findFirst({
    where: { id: body.customerId, userId },
    select: { stateCode: true, gstNumber: true },
  });
  if (!customer) {
    return { error: "FORBIDDEN" as const };
  }

  const sellerState =
    seller?.stateCode ?? stateCodeFromGstin(seller?.gstNumber) ?? null;
  const customerState =
    customer.stateCode ?? stateCodeFromGstin(customer.gstNumber) ?? null;
  const supplyType =
    gstScheme === "regular"
      ? resolveSupplyType(sellerState, customerState)
      : "none";

  const breakdown = computeInvoiceLines(
    body.lines.map((l) => ({
      productName: l.productName.trim(),
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      taxRate: l.taxRate,
    })),
    body.discountMode,
    body.discountValue,
    { gstScheme, supplyType },
  );

  if (breakdown.preDiscountSubtotal <= 0) {
    return { error: "EMPTY_LINES" as const };
  }

  return { breakdown, gstScheme, supplyType };
}

export function invoiceItemCreates(
  lineItems: ReturnType<typeof computeInvoiceLines>["items"],
) {
  return lineItems.map((row) => ({
    productName: row.productName.trim(),
    quantity: new Prisma.Decimal(row.quantity.toFixed(2)),
    unitPrice: new Prisma.Decimal(row.unitPrice.toFixed(2)),
    taxRate: new Prisma.Decimal(row.taxRate.toFixed(2)),
    taxAmount: new Prisma.Decimal(row.taxAmount.toFixed(2)),
    cgstAmount: new Prisma.Decimal(row.cgstAmount.toFixed(2)),
    sgstAmount: new Prisma.Decimal(row.sgstAmount.toFixed(2)),
    igstAmount: new Prisma.Decimal(row.igstAmount.toFixed(2)),
    total: new Prisma.Decimal(row.lineTotal.toFixed(2)),
    sortOrder: row.sortOrder,
  }));
}

export function invoiceTotalsData(
  breakdown: ReturnType<typeof computeInvoiceLines>,
  gstScheme: "regular" | "composition" | "unregistered",
  supplyType: "intra" | "inter" | "none",
) {
  return {
    subtotal: new Prisma.Decimal(breakdown.subtotal.toFixed(2)),
    discountAmount: new Prisma.Decimal(breakdown.discountAmount.toFixed(2)),
    taxAmount: new Prisma.Decimal(breakdown.taxAmount.toFixed(2)),
    cgstAmount: new Prisma.Decimal(breakdown.cgstAmount.toFixed(2)),
    sgstAmount: new Prisma.Decimal(breakdown.sgstAmount.toFixed(2)),
    igstAmount: new Prisma.Decimal(breakdown.igstAmount.toFixed(2)),
    totalAmount: new Prisma.Decimal(breakdown.totalAmount.toFixed(2)),
    gstSchemeAtIssue: gstScheme,
    supplyType,
  };
}
