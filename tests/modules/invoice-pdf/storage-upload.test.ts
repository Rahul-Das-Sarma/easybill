import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const storageMocks = vi.hoisted(() => ({
  upload: vi.fn(),
  createSignedUrl: vi.fn(),
  createServiceRoleClient: vi.fn(),
}));

const mocks = vi.hoisted(() => {
  const { createRequire } = require("node:module") as typeof import("node:module");
  const req = createRequire(import.meta.url);
  const { createMockInvoicePdfPrisma } =
    req("../../mocks/invoice-pdf-store.ts") as typeof import("../../mocks/invoice-pdf-store");
  return { mockPrisma: createMockInvoicePdfPrisma() };
});

vi.mock("@/lib/prisma", () => ({ prisma: mocks.mockPrisma }));
vi.mock("@/lib/supabase/service", () => ({
  createServiceRoleClient: () => storageMocks.createServiceRoleClient(),
  getInvoicePdfBucket: () => "invoice-pdfs",
}));

import {
  createSignedInvoicePdfUrl,
  invoicePdfObjectPath,
  uploadInvoicePdfAndSaveUrl,
} from "@/lib/invoice-pdf/storage-upload";

import { seedDefaultPdfInvoice } from "../../mocks/invoice-pdf-store";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const INVOICE_ID = "invoice-pdf-1";

describe("invoice-pdf storage-upload", () => {
  const envBackup = { ...process.env };

  beforeEach(() => {
    process.env = {
      ...envBackup,
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
    };
    mocks.mockPrisma.reset();
    seedDefaultPdfInvoice(mocks.mockPrisma, INVOICE_ID);
    storageMocks.upload.mockReset();
    storageMocks.createSignedUrl.mockReset();
    storageMocks.createServiceRoleClient.mockReset();
    storageMocks.createServiceRoleClient.mockReturnValue({
      storage: {
        from: () => ({
          upload: storageMocks.upload,
          createSignedUrl: storageMocks.createSignedUrl,
        }),
      },
    });
  });

  afterEach(() => {
    process.env = { ...envBackup };
  });

  it("builds deterministic object paths", () => {
    expect(invoicePdfObjectPath(USER_ID, INVOICE_ID)).toBe(
      `${USER_ID}/${INVOICE_ID}.pdf`,
    );
  });

  it("returns null when service role key is missing", async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    const result = await uploadInvoicePdfAndSaveUrl(
      USER_ID,
      INVOICE_ID,
      Buffer.from("pdf"),
    );

    expect(result).toBeNull();
  });

  it("uploads PDF and saves object path on invoice", async () => {
    storageMocks.upload.mockResolvedValue({ error: null });

    const result = await uploadInvoicePdfAndSaveUrl(
      USER_ID,
      INVOICE_ID,
      Buffer.from("%PDF-1.4"),
    );

    expect(result).toBe(`invoice-pdfs/${USER_ID}/${INVOICE_ID}.pdf`);
    expect(mocks.mockPrisma._invoices.get(INVOICE_ID)?.pdfUrl).toBe(
      `invoice-pdfs/${USER_ID}/${INVOICE_ID}.pdf`,
    );
  });

  it("returns null when upload fails", async () => {
    storageMocks.upload.mockResolvedValue({
      error: { message: "bucket missing" },
    });

    const result = await uploadInvoicePdfAndSaveUrl(
      USER_ID,
      INVOICE_ID,
      Buffer.from("pdf"),
    );

    expect(result).toBeNull();
  });

  it("creates signed URLs from stored object paths", async () => {
    storageMocks.createSignedUrl.mockResolvedValue({
      data: { signedUrl: "https://signed.example/pdf" },
      error: null,
    });

    const signed = await createSignedInvoicePdfUrl(
      `invoice-pdfs/${USER_ID}/${INVOICE_ID}.pdf`,
      3600,
    );

    expect(signed).toBe("https://signed.example/pdf");
    expect(storageMocks.createSignedUrl).toHaveBeenCalledWith(
      `${USER_ID}/${INVOICE_ID}.pdf`,
      3600,
    );
  });

  it("returns null for invalid object paths or signed URL errors", async () => {
    expect(await createSignedInvoicePdfUrl("bad-path", 60)).toBeNull();

    storageMocks.createSignedUrl.mockResolvedValue({
      data: null,
      error: { message: "failed" },
    });

    const signed = await createSignedInvoicePdfUrl(
      `invoice-pdfs/${USER_ID}/${INVOICE_ID}.pdf`,
      60,
    );
    expect(signed).toBeNull();
  });

  it("returns null when service role key is missing for signed URLs", async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    const signed = await createSignedInvoicePdfUrl(
      `invoice-pdfs/${USER_ID}/${INVOICE_ID}.pdf`,
      60,
    );
    expect(signed).toBeNull();
  });
});
