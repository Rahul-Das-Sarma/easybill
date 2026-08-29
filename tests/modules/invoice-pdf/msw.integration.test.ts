import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it } from "vitest";

import { server } from "../../mocks/server";
import {
  resetInvoicePdfStore,
  seedInvoicePdfPayload,
  seedStoredPdfUrl,
} from "../../mocks/handlers/invoice-pdf";
import { createSamplePdfPayload } from "../../mocks/invoice-pdf-store";

const INVOICE_ID = "msw-invoice-pdf";

describe("invoice PDF — MSW mock server integration", () => {
  beforeEach(() => {
    resetInvoicePdfStore();
    seedInvoicePdfPayload(
      INVOICE_ID,
      createSamplePdfPayload({
        invoice: {
          ...createSamplePdfPayload().invoice,
          id: INVOICE_ID,
          invoiceNumber: "INV-MSW-001",
        },
      }),
    );
  });

  it("returns preview payload via /pdf-data", async () => {
    const res = await fetch(`http://localhost/api/invoices/${INVOICE_ID}/pdf-data`, {
      headers: { Authorization: "Bearer test-user" },
    });

    expect(res.status).toBe(200);
    const data = (await res.json()) as { invoice: { invoiceNumber: string } };
    expect(data.invoice.invoiceNumber).toBe("INV-MSW-001");
  });

  it("returns PDF bytes via /pdf", async () => {
    const res = await fetch(`http://localhost/api/invoices/${INVOICE_ID}/pdf`, {
      headers: { Authorization: "Bearer test-user" },
    });

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/pdf");
    const bytes = new Uint8Array(await res.arrayBuffer());
    expect(bytes[0]).toBe(0x25);
  });

  it("returns signed URL when PDF is stored", async () => {
    seedStoredPdfUrl(INVOICE_ID, `invoice-pdfs/user/${INVOICE_ID}.pdf`);

    const res = await fetch(
      `http://localhost/api/invoices/${INVOICE_ID}/signed-pdf-url?ttl=3600`,
      { headers: { Authorization: "Bearer test-user" } },
    );

    expect(res.status).toBe(200);
    const data = (await res.json()) as { signedUrl: string; expiresInSeconds: number };
    expect(data.signedUrl).toContain("https://signed.example/");
    expect(data.expiresInSeconds).toBe(3600);
  });

  it("allows runtime handler overrides via server.use", async () => {
    server.use(
      http.get("*/api/invoices/:id/pdf-data", () =>
        HttpResponse.json({ invoice: { invoiceNumber: "OVERRIDE" } }),
      ),
    );

    const res = await fetch(`http://localhost/api/invoices/${INVOICE_ID}/pdf-data`, {
      headers: { Authorization: "Bearer test-user" },
    });
    const data = (await res.json()) as { invoice: { invoiceNumber: string } };
    expect(data.invoice.invoiceNumber).toBe("OVERRIDE");
  });
});
