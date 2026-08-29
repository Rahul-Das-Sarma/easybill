import { beforeEach, describe, expect, it, vi } from "vitest";

import { createSupabaseUser } from "../../mocks/auth-store";
import {
  createDefaultPdfUser,
  createMockInvoicePdfPrisma,
  seedDefaultPdfInvoice,
  USER_ID,
} from "../../mocks/invoice-pdf-store";

const mocks = vi.hoisted(() => {
  const { createRequire } = require("node:module") as typeof import("node:module");
  const req = createRequire(import.meta.url);
  const { createMockInvoicePdfPrisma } =
    req("../../mocks/invoice-pdf-store.ts") as typeof import("../../mocks/invoice-pdf-store");
  return { mockPrisma: createMockInvoicePdfPrisma() };
});

vi.mock("@/lib/prisma", () => ({ prisma: mocks.mockPrisma }));

import { loadInvoicePdfPayload } from "@/lib/invoice-pdf/load-payload";

const INVOICE_ID = "invoice-pdf-1";

describe("loadInvoicePdfPayload", () => {
  beforeEach(() => {
    mocks.mockPrisma.reset();
    seedDefaultPdfInvoice(mocks.mockPrisma, INVOICE_ID);
  });

  it("returns null when invoice is not found", async () => {
    const result = await loadInvoicePdfPayload("missing", USER_ID);
    expect(result).toBeNull();
  });

  it("maps invoice, business, customer, and line items", async () => {
    const result = await loadInvoicePdfPayload(INVOICE_ID, USER_ID);

    expect(result).not.toBeNull();
    expect(result?.plan).toBe("free");
    expect(result?.business.companyName).toBe("Acme Traders Pvt Ltd");
    expect(result?.customer.name).toBe("Acme Traders");
    expect(result?.invoice.invoiceNumber).toBe("INV-2026-001");
    expect(result?.items).toHaveLength(1);
    expect(result?.items[0]?.productName).toBe("Widget");
  });

  it("uses pro plan when user plan is pro", async () => {
    mocks.mockPrisma.seedUser(createDefaultPdfUser({ plan: "pro" }));

    const result = await loadInvoicePdfPayload(INVOICE_ID, USER_ID);
    expect(result?.plan).toBe("pro");
  });
});
