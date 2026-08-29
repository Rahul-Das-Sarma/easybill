import { http, HttpResponse } from "msw";

import { computeInvoiceLines } from "@/lib/invoice-math";
import type { GstScheme, SupplyType } from "@/lib/gst-india";
import type { GstRate } from "@/lib/invoice-math";

const BASE = "http://test.local";

type ComputeBody = {
  lines: {
    productName: string;
    quantity: number;
    unitPrice: number;
    taxRate: GstRate;
  }[];
  discountMode: "flat" | "percent";
  discountValue: number;
  taxContext?: {
    gstScheme: GstScheme;
    supplyType?: SupplyType;
  };
};

/** Mock billing API — mirrors server-side invoice total computation. */
export const gstBillingHandlers = [
  http.post(`${BASE}/api/billing/compute`, async ({ request }) => {
    let body: ComputeBody;
    try {
      body = (await request.json()) as ComputeBody;
    } catch {
      return HttpResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    if (!Array.isArray(body.lines) || body.lines.length === 0) {
      return HttpResponse.json(
        { error: "At least one line required" },
        { status: 400 },
      );
    }

    const result = computeInvoiceLines(
      body.lines,
      body.discountMode,
      body.discountValue,
      body.taxContext ?? { gstScheme: "regular", supplyType: "intra" },
    );

    return HttpResponse.json(result);
  }),
];

export { BASE as GST_BILLING_API_BASE };
