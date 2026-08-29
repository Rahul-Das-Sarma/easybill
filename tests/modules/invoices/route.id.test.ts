import { beforeEach, describe, expect, it, vi } from "vitest";

import { createSupabaseUser } from "../../mocks/auth-store";
import {
  createDefaultCustomer,
  createDefaultUser,
  createMockInvoice,
  CUSTOMER_ID,
  d,
  USER_ID,
  validCreateBody,
} from "../../mocks/invoice-store";

const mocks = vi.hoisted(() => {
  const { createRequire } = require("node:module") as typeof import("node:module");
  const req = createRequire(import.meta.url);
  const { createMockInvoicePrisma } =
    req("../../mocks/invoice-store.ts") as typeof import("../../mocks/invoice-store");
  return {
    mockPrisma: createMockInvoicePrisma(),
    mockGetSessionUser: vi.fn(),
    mockEnsureAppUser: vi.fn(),
  };
});

vi.mock("@/lib/prisma", () => ({ prisma: mocks.mockPrisma }));
vi.mock("@/lib/auth-user", () => ({
  getSessionUser: () => mocks.mockGetSessionUser(),
  ensureAppUser: (user: unknown) => mocks.mockEnsureAppUser(user),
}));

import { DELETE, GET, PATCH } from "@/app/api/invoices/[id]/route";

const INVOICE_ID = "invoice-test-1";

function params(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("GET /api/invoices/[id]", () => {
  beforeEach(() => {
    mocks.mockPrisma.reset();
    mocks.mockGetSessionUser.mockReset();
    mocks.mockGetSessionUser.mockResolvedValue(createSupabaseUser({ id: USER_ID }));
    mocks.mockPrisma.seedUser(createDefaultUser());
    mocks.mockPrisma.seedCustomer(createDefaultCustomer());
  });

  it("returns 401 when unauthenticated", async () => {
    mocks.mockGetSessionUser.mockResolvedValue(null);
    const res = await GET(new Request("http://localhost"), params(INVOICE_ID));
    expect(res.status).toBe(401);
  });

  it("returns 404 when invoice not found", async () => {
    const res = await GET(new Request("http://localhost"), params(INVOICE_ID));
    expect(res.status).toBe(404);
  });

  it("returns invoice with customer and lines", async () => {
    mocks.mockPrisma.seedInvoice(
      createMockInvoice({ id: INVOICE_ID, invoiceNumber: "INV-2026-001" }),
      [
        {
          productName: "Widget",
          quantity: d(1),
          unitPrice: d(100),
          taxRate: d(18),
          taxAmount: d(18),
          cgstAmount: d(9),
          sgstAmount: d(9),
          igstAmount: d(0),
          total: d(118),
          sortOrder: 0,
        },
      ],
    );

    const res = await GET(new Request("http://localhost"), params(INVOICE_ID));
    const json = (await res.json()) as {
      invoice: {
        invoiceNumber: string;
        lines: { productName: string }[];
        customer: { name: string };
      };
    };

    expect(res.status).toBe(200);
    expect(json.invoice.invoiceNumber).toBe("INV-2026-001");
    expect(json.invoice.lines[0]?.productName).toBe("Widget");
    expect(json.invoice.customer.name).toBe("Acme Traders");
  });
});

describe("PATCH /api/invoices/[id]", () => {
  beforeEach(() => {
    mocks.mockPrisma.reset();
    mocks.mockGetSessionUser.mockReset();
    mocks.mockGetSessionUser.mockResolvedValue(createSupabaseUser({ id: USER_ID }));
    mocks.mockPrisma.seedUser(createDefaultUser());
    mocks.mockPrisma.seedCustomer(createDefaultCustomer());
    mocks.mockPrisma.seedInvoice(
      createMockInvoice({ id: INVOICE_ID, invoiceNumber: "INV-2026-001", status: "draft" }),
      [
        {
          productName: "Old",
          quantity: d(1),
          unitPrice: d(100),
          taxRate: d(18),
          taxAmount: d(18),
          cgstAmount: d(9),
          sgstAmount: d(9),
          igstAmount: d(0),
          total: d(118),
          sortOrder: 0,
        },
      ],
    );
  });

  it("returns 401 when unauthenticated", async () => {
    mocks.mockGetSessionUser.mockResolvedValue(null);
    const res = await PATCH(
      new Request("http://localhost", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validCreateBody()),
      }),
      params(INVOICE_ID),
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 for validation errors", async () => {
    const res = await PATCH(
      new Request("http://localhost", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...validCreateBody(),
          issueDate: "bad-date",
        }),
      }),
      params(INVOICE_ID),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when invoice is not draft", async () => {
    mocks.mockPrisma.seedInvoice(
      createMockInvoice({
        id: "inv-pending",
        invoiceNumber: "INV-P",
        status: "pending",
      }),
    );

    const res = await PATCH(
      new Request("http://localhost", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...validCreateBody(),
          customerId: CUSTOMER_ID,
        }),
      }),
      params("inv-pending"),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when invoice has payments", async () => {
    mocks.mockPrisma.seedInvoice(
      createMockInvoice({
        id: "inv-paid-part",
        invoiceNumber: "INV-PP",
        status: "draft",
        amountPaid: d(10),
      }),
    );

    const res = await PATCH(
      new Request("http://localhost", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validCreateBody()),
      }),
      params("inv-paid-part"),
    );
    expect(res.status).toBe(400);
  });

  it("returns 403 when customer is not owned", async () => {
    const res = await PATCH(
      new Request("http://localhost", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...validCreateBody(),
          customerId: "44444444-4444-4444-8444-444444444444",
        }),
      }),
      params(INVOICE_ID),
    );
    expect(res.status).toBe(403);
  });

  it("updates draft invoice", async () => {
    const res = await PATCH(
      new Request("http://localhost", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...validCreateBody(),
          lines: [
            { productName: "Updated", quantity: 2, unitPrice: 50, taxRate: 18 },
          ],
          notes: "Updated note",
          customerNotes: "   ",
        }),
      }),
      params(INVOICE_ID),
    );

    const json = (await res.json()) as { invoice: { invoiceNumber: string } };
    expect(res.status).toBe(200);
    expect(json.invoice.invoiceNumber).toBe("INV-2026-001");
  });

  it("returns 400 for invalid JSON on patch", async () => {
    const res = await PATCH(
      new Request("http://localhost", { method: "PATCH", body: "{" }),
      params(INVOICE_ID),
    );
    expect(res.status).toBe(400);
  });

  it("returns 404 when patching missing invoice", async () => {
    const res = await PATCH(
      new Request("http://localhost", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validCreateBody()),
      }),
      params("missing-invoice"),
    );
    expect(res.status).toBe(404);
  });

  it("returns 400 when patched lines have no taxable value", async () => {
    const res = await PATCH(
      new Request("http://localhost", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...validCreateBody(),
          lines: [{ productName: "Free", quantity: 1, unitPrice: 0, taxRate: 0 }],
        }),
      }),
      params(INVOICE_ID),
    );
    expect(res.status).toBe(400);
  });
});

describe("DELETE /api/invoices/[id]", () => {
  beforeEach(() => {
    mocks.mockPrisma.reset();
    mocks.mockGetSessionUser.mockReset();
    mocks.mockGetSessionUser.mockResolvedValue(createSupabaseUser({ id: USER_ID }));
  });

  it("returns 404 when invoice not found", async () => {
    const res = await DELETE(new Request("http://localhost"), params(INVOICE_ID));
    expect(res.status).toBe(404);
  });

  it("returns 400 when invoice is not draft", async () => {
    mocks.mockPrisma.seedInvoice(
      createMockInvoice({
        id: INVOICE_ID,
        invoiceNumber: "INV-X",
        status: "pending",
      }),
    );

    const res = await DELETE(new Request("http://localhost"), params(INVOICE_ID));
    expect(res.status).toBe(400);
  });

  it("returns 400 when invoice has payments", async () => {
    mocks.mockPrisma.seedInvoice(
      createMockInvoice({
        id: INVOICE_ID,
        invoiceNumber: "INV-X",
        status: "draft",
        amountPaid: d(1),
      }),
    );

    const res = await DELETE(new Request("http://localhost"), params(INVOICE_ID));
    expect(res.status).toBe(400);
  });

  it("deletes draft invoice", async () => {
    mocks.mockPrisma.seedInvoice(
      createMockInvoice({
        id: INVOICE_ID,
        invoiceNumber: "INV-DEL",
        status: "draft",
      }),
    );

    const res = await DELETE(new Request("http://localhost"), params(INVOICE_ID));
    expect(res.status).toBe(200);
    const json = (await res.json()) as { ok: boolean };
    expect(json.ok).toBe(true);
    expect(mocks.mockPrisma._invoices.has(INVOICE_ID)).toBe(false);
  });

  it("returns 401 when deleting unauthenticated", async () => {
    mocks.mockGetSessionUser.mockResolvedValue(null);
    const res = await DELETE(new Request("http://localhost"), params(INVOICE_ID));
    expect(res.status).toBe(401);
  });
});
