import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { GST_BILLING_API_BASE } from "../../mocks/handlers/gst-billing";
import { server } from "../../mocks/server";

describe("GST billing — MSW mock server integration", () => {
  it("computes invoice totals via mock POST /api/billing/compute", async () => {
    const res = await fetch(`${GST_BILLING_API_BASE}/api/billing/compute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lines: [
          { productName: "Service", quantity: 1, unitPrice: 1000, taxRate: 18 },
        ],
        discountMode: "percent",
        discountValue: 10,
        taxContext: { gstScheme: "regular", supplyType: "inter" },
      }),
    });

    expect(res.status).toBe(200);
    const data = (await res.json()) as {
      subtotal: number;
      igstAmount: number;
      totalAmount: number;
    };

    expect(data.subtotal).toBe(900);
    expect(data.igstAmount).toBe(162);
    expect(data.totalAmount).toBe(1062);
  });

  it("returns 400 for invalid JSON body", async () => {
    const res = await fetch(`${GST_BILLING_API_BASE}/api/billing/compute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-json",
    });

    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: string };
    expect(data.error).toBe("Invalid JSON");
  });

  it("returns 400 when lines array is empty", async () => {
    const res = await fetch(`${GST_BILLING_API_BASE}/api/billing/compute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lines: [],
        discountMode: "flat",
        discountValue: 0,
      }),
    });

    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: string };
    expect(data.error).toBe("At least one line required");
  });

  it("allows runtime handler overrides via server.use", async () => {
    server.use(
      http.post(`${GST_BILLING_API_BASE}/api/billing/compute`, () =>
        HttpResponse.json({ totalAmount: 42 }),
      ),
    );

    const res = await fetch(`${GST_BILLING_API_BASE}/api/billing/compute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lines: [
          { productName: "X", quantity: 1, unitPrice: 1, taxRate: 18 },
        ],
        discountMode: "flat",
        discountValue: 0,
      }),
    });

    const data = (await res.json()) as { totalAmount: number };
    expect(data.totalAmount).toBe(42);
  });
});
