import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createSupabaseUser } from "../../mocks/auth-store";
import {
  seedDefaultPdfInvoice,
  USER_ID,
} from "../../mocks/invoice-pdf-store";

const mocks = vi.hoisted(() => {
  const { createRequire } = require("node:module") as typeof import("node:module");
  const req = createRequire(import.meta.url);
  const { createMockInvoicePdfPrisma } =
    req("../../mocks/invoice-pdf-store.ts") as typeof import("../../mocks/invoice-pdf-store");
  return {
    mockPrisma: createMockInvoicePdfPrisma(),
    mockGetSessionUser: vi.fn(),
    mockEnsureAppUser: vi.fn(),
    mockRenderPdf: vi.fn(),
    mockUploadPdf: vi.fn(),
    mockSignedUrl: vi.fn(),
  };
});

vi.mock("@/lib/prisma", () => ({ prisma: mocks.mockPrisma }));
vi.mock("@/lib/auth-user", () => ({
  getSessionUser: () => mocks.mockGetSessionUser(),
  ensureAppUser: (user: unknown) => mocks.mockEnsureAppUser(user),
}));
vi.mock("@/lib/invoice-pdf/render-pdf", () => ({
  renderInvoicePdfBuffer: (...args: unknown[]) => mocks.mockRenderPdf(...args),
}));
vi.mock("@/lib/invoice-pdf/storage-upload", () => ({
  uploadInvoicePdfAndSaveUrl: (...args: unknown[]) => mocks.mockUploadPdf(...args),
  createSignedInvoicePdfUrl: (...args: unknown[]) => mocks.mockSignedUrl(...args),
}));

import { GET as GET_PDF } from "@/app/api/invoices/[id]/pdf/route";
import { GET as GET_PDF_DATA } from "@/app/api/invoices/[id]/pdf-data/route";
import { GET as GET_SIGNED_URL } from "@/app/api/invoices/[id]/signed-pdf-url/route";

const INVOICE_ID = "invoice-pdf-1";

function params(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("invoice PDF API routes", () => {
  const envBackup = { ...process.env };

  beforeEach(() => {
    mocks.mockPrisma.reset();
    mocks.mockGetSessionUser.mockReset();
    mocks.mockEnsureAppUser.mockReset();
    mocks.mockRenderPdf.mockReset();
    mocks.mockUploadPdf.mockReset();
    mocks.mockSignedUrl.mockReset();
    mocks.mockGetSessionUser.mockResolvedValue(createSupabaseUser({ id: USER_ID }));
    seedDefaultPdfInvoice(mocks.mockPrisma, INVOICE_ID);
    mocks.mockRenderPdf.mockResolvedValue(Buffer.from("%PDF-1.4"));
    mocks.mockUploadPdf.mockResolvedValue(`invoice-pdfs/${USER_ID}/${INVOICE_ID}.pdf`);
    mocks.mockSignedUrl.mockResolvedValue("https://signed.example/pdf");
    process.env = {
      ...envBackup,
      SUPABASE_SERVICE_ROLE_KEY: "service-role",
    };
  });

  afterEach(() => {
    process.env = { ...envBackup };
  });

  describe("GET /api/invoices/[id]/pdf-data", () => {
    it("returns 401 when unauthenticated", async () => {
      mocks.mockGetSessionUser.mockResolvedValue(null);
      const res = await GET_PDF_DATA(new Request("http://localhost"), params(INVOICE_ID));
      expect(res.status).toBe(401);
    });

    it("returns 404 when invoice is missing", async () => {
      const res = await GET_PDF_DATA(new Request("http://localhost"), params("missing"));
      expect(res.status).toBe(404);
    });

    it("returns JSON payload for preview", async () => {
      const res = await GET_PDF_DATA(new Request("http://localhost"), params(INVOICE_ID));
      const json = (await res.json()) as { invoice: { invoiceNumber: string } };
      expect(res.status).toBe(200);
      expect(json.invoice.invoiceNumber).toBe("INV-2026-001");
    });
  });

  describe("GET /api/invoices/[id]/pdf", () => {
    it("returns 401 when unauthenticated", async () => {
      mocks.mockGetSessionUser.mockResolvedValue(null);
      const res = await GET_PDF(new Request("http://localhost"), params(INVOICE_ID));
      expect(res.status).toBe(401);
    });

    it("returns 404 when invoice is missing", async () => {
      const res = await GET_PDF(new Request("http://localhost"), params("missing"));
      expect(res.status).toBe(404);
    });

    it("returns PDF bytes with attachment headers", async () => {
      const res = await GET_PDF(new Request("http://localhost"), params(INVOICE_ID));
      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toBe("application/pdf");
      expect(res.headers.get("Content-Disposition")).toContain("INV-2026-001.pdf");
      const bytes = new Uint8Array(await res.arrayBuffer());
      expect(bytes.length).toBeGreaterThan(0);
      expect(mocks.mockUploadPdf).toHaveBeenCalled();
    });

    it("still returns PDF when storage upload throws", async () => {
      mocks.mockUploadPdf.mockRejectedValueOnce(new Error("storage down"));
      vi.spyOn(console, "error").mockImplementation(() => {});

      const res = await GET_PDF(new Request("http://localhost"), params(INVOICE_ID));
      expect(res.status).toBe(200);
    });

    it("sanitizes unsafe invoice numbers in filenames", async () => {
      const row = mocks.mockPrisma._invoices.get(INVOICE_ID)!;
      row.invoiceNumber = "INV/2026\\001";

      const res = await GET_PDF(new Request("http://localhost"), params(INVOICE_ID));
      expect(res.headers.get("Content-Disposition")).toContain("INV_2026_001.pdf");
    });
  });

  describe("GET /api/invoices/[id]/signed-pdf-url", () => {
    it("returns 401 when unauthenticated", async () => {
      mocks.mockGetSessionUser.mockResolvedValue(null);
      const res = await GET_SIGNED_URL(
        new Request("http://localhost"),
        params(INVOICE_ID),
      );
      expect(res.status).toBe(401);
    });

    it("returns 404 when invoice is missing", async () => {
      const res = await GET_SIGNED_URL(
        new Request("http://localhost"),
        params("missing"),
      );
      expect(res.status).toBe(404);
    });

    it("returns 400 when no stored PDF exists", async () => {
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;
      const res = await GET_SIGNED_URL(
        new Request("http://localhost"),
        params(INVOICE_ID),
      );
      expect(res.status).toBe(400);
    });

    it("generates and signs PDF when pdfUrl is missing", async () => {
      mocks.mockUploadPdf.mockImplementation(async () => {
        const row = mocks.mockPrisma._invoices.get(INVOICE_ID);
        if (row) row.pdfUrl = `invoice-pdfs/${USER_ID}/${INVOICE_ID}.pdf`;
        return row?.pdfUrl ?? null;
      });

      const res = await GET_SIGNED_URL(
        new Request("http://localhost/api/invoices/x/signed-pdf-url?ttl=120"),
        params(INVOICE_ID),
      );

      expect(res.status).toBe(200);
      const json = (await res.json()) as {
        signedUrl: string;
        expiresInSeconds: number;
      };
      expect(json.expiresInSeconds).toBe(120);
      expect(json.signedUrl).toBe("https://signed.example/pdf");
      expect(mocks.mockRenderPdf).toHaveBeenCalled();
    });

    it("returns signed URL for existing pdfUrl", async () => {
      const row = mocks.mockPrisma._invoices.get(INVOICE_ID)!;
      row.pdfUrl = `invoice-pdfs/${USER_ID}/${INVOICE_ID}.pdf`;

      const res = await GET_SIGNED_URL(
        new Request("http://localhost"),
        params(INVOICE_ID),
      );

      expect(res.status).toBe(200);
      expect(mocks.mockRenderPdf).not.toHaveBeenCalled();
    });

    it("returns 500 when signed URL creation fails", async () => {
      const row = mocks.mockPrisma._invoices.get(INVOICE_ID)!;
      row.pdfUrl = `invoice-pdfs/${USER_ID}/${INVOICE_ID}.pdf`;
      mocks.mockSignedUrl.mockResolvedValueOnce(null);

      const res = await GET_SIGNED_URL(
        new Request("http://localhost"),
        params(INVOICE_ID),
      );
      expect(res.status).toBe(500);
    });

    it("clamps ttl to allowed bounds", async () => {
      const row = mocks.mockPrisma._invoices.get(INVOICE_ID)!;
      row.pdfUrl = `invoice-pdfs/${USER_ID}/${INVOICE_ID}.pdf`;

      await GET_SIGNED_URL(
        new Request("http://localhost/api/invoices/x/signed-pdf-url?ttl=9999999"),
        params(INVOICE_ID),
      );

      expect(mocks.mockSignedUrl).toHaveBeenCalledWith(
        row.pdfUrl,
        60 * 60 * 24 * 7,
      );
    });

    it("uses minimum ttl for very small values", async () => {
      const row = mocks.mockPrisma._invoices.get(INVOICE_ID)!;
      row.pdfUrl = `invoice-pdfs/${USER_ID}/${INVOICE_ID}.pdf`;

      await GET_SIGNED_URL(
        new Request("http://localhost/api/invoices/x/signed-pdf-url?ttl=10"),
        params(INVOICE_ID),
      );

      expect(mocks.mockSignedUrl).toHaveBeenCalledWith(row.pdfUrl, 60);
    });
  });
});
