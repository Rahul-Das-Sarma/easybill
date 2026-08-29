import { http, HttpResponse } from "msw";

import {
  createSamplePdfPayload,
} from "../invoice-pdf-store";

const payloads = new Map<string, ReturnType<typeof createSamplePdfPayload>>();
const pdfUrls = new Map<string, string>();
const signedUrls = new Map<string, string>();

export function resetInvoicePdfStore() {
  payloads.clear();
  pdfUrls.clear();
  signedUrls.clear();
}

export function seedInvoicePdfPayload(
  invoiceId: string,
  payload?: ReturnType<typeof createSamplePdfPayload>,
) {
  payloads.set(
    invoiceId,
    payload ??
      createSamplePdfPayload({
        invoice: {
          ...createSamplePdfPayload().invoice,
          id: invoiceId,
        },
      }),
  );
}

export function seedStoredPdfUrl(invoiceId: string, objectPath: string) {
  pdfUrls.set(invoiceId, objectPath);
}

export const invoicePdfHandlers = [
  http.get("*/api/invoices/:id/pdf-data", ({ params, request }) => {
    const auth = request.headers.get("Authorization");
    if (!auth) {
      return HttpResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = payloads.get(String(params.id));
    if (!payload) {
      return HttpResponse.json({ error: "Not found" }, { status: 404 });
    }

    return HttpResponse.json(payload);
  }),

  http.get("*/api/invoices/:id/pdf", async ({ params, request }) => {
    const auth = request.headers.get("Authorization");
    if (!auth) {
      return HttpResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const id = String(params.id);
    const payload = payloads.get(id);
    if (!payload) {
      return HttpResponse.json({ error: "Not found" }, { status: 404 });
    }

    pdfUrls.set(id, `invoice-pdfs/user/${id}.pdf`);
    const body = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]);
    return new HttpResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${payload.invoice.invoiceNumber}.pdf"`,
      },
    });
  }),

  http.get("*/api/invoices/:id/signed-pdf-url", ({ params, request }) => {
    const auth = request.headers.get("Authorization");
    if (!auth) {
      return HttpResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const id = String(params.id);
    const objectPath = pdfUrls.get(id);
    if (!objectPath) {
      return HttpResponse.json(
        { error: "No stored PDF. Download the invoice once." },
        { status: 400 },
      );
    }

    const url = new URL(request.url);
    const ttl = Number.parseInt(url.searchParams.get("ttl") ?? "604800", 10);
    const signedUrl = signedUrls.get(id) ?? `https://signed.example/${id}`;
    signedUrls.set(id, signedUrl);

    const payload = payloads.get(id);
    return HttpResponse.json({
      signedUrl,
      expiresInSeconds: ttl,
      invoiceNumber: payload?.invoice.invoiceNumber ?? "INV",
    });
  }),
];
