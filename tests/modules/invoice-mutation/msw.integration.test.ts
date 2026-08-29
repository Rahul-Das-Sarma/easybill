import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { computeInvoiceLines } from "@/lib/invoice-math";

import { INVOICE_MUTATION_API_BASE } from "../../mocks/handlers/invoice-mutation";
import { validCreateBody } from "../../mocks/invoice-store";
import { server } from "../../mocks/server";

describe("invoice-mutation — MSW mock server integration", () => {
  it("builds totals via mock POST /api/invoice-mutation/totals", async () => {
    const res = await fetch(`${INVOICE_MUTATION_API_BASE}/api/invoice-mutation/totals`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        seller: { gstScheme: "regular", stateCode: "27" },
        customer: { stateCode: "09", gstNumber: "09AABCU9603R1ZM" },
        mutation: validCreateBody(),
      }),
    });

    expect(res.status).toBe(200);
    const data = (await res.json()) as {
      supplyType: string;
      breakdown: { igstAmount: number; totalAmount: number };
    };

    expect(data.supplyType).toBe("inter");
    expect(data.breakdown.igstAmount).toBe(18);
    expect(data.breakdown.totalAmount).toBe(118);
  });

  it("returns 403 when customer context is missing", async () => {
    const res = await fetch(`${INVOICE_MUTATION_API_BASE}/api/invoice-mutation/totals`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        seller: { gstScheme: "regular", stateCode: "27" },
        customer: null,
        mutation: validCreateBody(),
      }),
    });

    expect(res.status).toBe(403);
    const data = (await res.json()) as { error: string };
    expect(data.error).toBe("FORBIDDEN");
  });

  it("returns 400 for empty line totals", async () => {
    const res = await fetch(`${INVOICE_MUTATION_API_BASE}/api/invoice-mutation/totals`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        seller: { gstScheme: "regular", stateCode: "27" },
        customer: { stateCode: "27" },
        mutation: {
          ...validCreateBody(),
          lines: [{ productName: "Free", quantity: 1, unitPrice: 0, taxRate: 0 }],
        },
      }),
    });

    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: string };
    expect(data.error).toBe("EMPTY_LINES");
  });

  it("formats items and totals via mock POST /api/invoice-mutation/format", async () => {
    const breakdown = computeInvoiceLines(
      [{ productName: "Widget", quantity: 1, unitPrice: 100, taxRate: 18 }],
      "flat",
      0,
      { gstScheme: "regular", supplyType: "intra" },
    );

    const res = await fetch(`${INVOICE_MUTATION_API_BASE}/api/invoice-mutation/format`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        breakdown,
        gstScheme: "regular",
        supplyType: "intra",
      }),
    });

    expect(res.status).toBe(200);
    const data = (await res.json()) as {
      items: { total: string }[];
      totals: { totalAmount: string; supplyType: string };
    };

    expect(Number(data.items[0]?.total)).toBe(118);
    expect(Number(data.totals.totalAmount)).toBe(118);
    expect(data.totals.supplyType).toBe("intra");
  });

  it("returns 400 for invalid JSON on totals endpoint", async () => {
    const res = await fetch(`${INVOICE_MUTATION_API_BASE}/api/invoice-mutation/totals`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-json",
    });

    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: string };
    expect(data.error).toBe("Invalid JSON");
  });

  it("allows runtime handler overrides via server.use", async () => {
    server.use(
      http.post(`${INVOICE_MUTATION_API_BASE}/api/invoice-mutation/totals`, () =>
        HttpResponse.json({ breakdown: { totalAmount: 42 }, gstScheme: "regular", supplyType: "intra" }),
      ),
    );

    const res = await fetch(`${INVOICE_MUTATION_API_BASE}/api/invoice-mutation/totals`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        seller: { gstScheme: "regular", stateCode: "27" },
        customer: { stateCode: "27" },
        mutation: validCreateBody(),
      }),
    });

    const data = (await res.json()) as { breakdown: { totalAmount: number } };
    expect(data.breakdown.totalAmount).toBe(42);
  });
});
