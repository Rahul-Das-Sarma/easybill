import { http, HttpResponse } from "msw";

import { Prisma } from "@/generated/prisma/client";
import { resolveSupplyType, stateCodeFromGstin } from "@/lib/gst-india";
import type { InvoiceMutationBody } from "@/lib/invoice-mutation-schema";
import { computeInvoiceLines } from "@/lib/invoice-math";

const BASE = "http://test.local";

type SellerContext = {
  gstScheme?: "regular" | "composition" | "unregistered";
  stateCode?: string | null;
  gstNumber?: string | null;
};

type CustomerContext = {
  stateCode?: string | null;
  gstNumber?: string | null;
};

type BuildTotalsBody = {
  seller: SellerContext;
  customer: CustomerContext | null;
  mutation: InvoiceMutationBody;
};

type FormatBody = {
  breakdown: ReturnType<typeof computeInvoiceLines>;
  gstScheme: "regular" | "composition" | "unregistered";
  supplyType: "intra" | "inter" | "none";
};

/** Mock API mirroring invoice mutation helpers used by PATCH /api/invoices/[id]. */
export const invoiceMutationHandlers = [
  http.post(`${BASE}/api/invoice-mutation/totals`, async ({ request }) => {
    let body: BuildTotalsBody;
    try {
      body = (await request.json()) as BuildTotalsBody;
    } catch {
      return HttpResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    if (!body.customer) {
      return HttpResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    const gstScheme = body.seller.gstScheme ?? "regular";
    const sellerState =
      body.seller.stateCode ??
      stateCodeFromGstin(body.seller.gstNumber) ??
      null;
    const customerState =
      body.customer.stateCode ??
      stateCodeFromGstin(body.customer.gstNumber) ??
      null;
    const supplyType =
      gstScheme === "regular"
        ? resolveSupplyType(sellerState, customerState)
        : "none";

    const breakdown = computeInvoiceLines(
      body.mutation.lines.map((l) => ({
        productName: l.productName.trim(),
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        taxRate: l.taxRate,
      })),
      body.mutation.discountMode,
      body.mutation.discountValue,
      { gstScheme, supplyType },
    );

    if (breakdown.preDiscountSubtotal <= 0) {
      return HttpResponse.json({ error: "EMPTY_LINES" }, { status: 400 });
    }

    return HttpResponse.json({ breakdown, gstScheme, supplyType });
  }),

  http.post(`${BASE}/api/invoice-mutation/format`, async ({ request }) => {
    let body: FormatBody;
    try {
      body = (await request.json()) as FormatBody;
    } catch {
      return HttpResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const items = body.breakdown.items.map((row) => ({
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
    const totals = {
      subtotal: new Prisma.Decimal(body.breakdown.subtotal.toFixed(2)),
      discountAmount: new Prisma.Decimal(body.breakdown.discountAmount.toFixed(2)),
      taxAmount: new Prisma.Decimal(body.breakdown.taxAmount.toFixed(2)),
      cgstAmount: new Prisma.Decimal(body.breakdown.cgstAmount.toFixed(2)),
      sgstAmount: new Prisma.Decimal(body.breakdown.sgstAmount.toFixed(2)),
      igstAmount: new Prisma.Decimal(body.breakdown.igstAmount.toFixed(2)),
      totalAmount: new Prisma.Decimal(body.breakdown.totalAmount.toFixed(2)),
      gstSchemeAtIssue: body.gstScheme,
      supplyType: body.supplyType,
    };

    return HttpResponse.json({
      items: items.map((row) => ({
        productName: row.productName,
        quantity: row.quantity.toString(),
        unitPrice: row.unitPrice.toString(),
        taxRate: row.taxRate.toString(),
        taxAmount: row.taxAmount.toString(),
        cgstAmount: row.cgstAmount.toString(),
        sgstAmount: row.sgstAmount.toString(),
        igstAmount: row.igstAmount.toString(),
        total: row.total.toString(),
        sortOrder: row.sortOrder,
      })),
      totals: {
        subtotal: totals.subtotal.toString(),
        discountAmount: totals.discountAmount.toString(),
        taxAmount: totals.taxAmount.toString(),
        cgstAmount: totals.cgstAmount.toString(),
        sgstAmount: totals.sgstAmount.toString(),
        igstAmount: totals.igstAmount.toString(),
        totalAmount: totals.totalAmount.toString(),
        gstSchemeAtIssue: totals.gstSchemeAtIssue,
        supplyType: totals.supplyType,
      },
    });
  }),
];

export { BASE as INVOICE_MUTATION_API_BASE };
