import { beforeEach, describe, expect, it, vi } from "vitest";

import { createSupabaseUser } from "../../mocks/auth-store";
import {
  createDefaultCustomer,
  createDefaultUser,
  CUSTOMER_ID,
  OTHER_CUSTOMER_ID,
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
    mockGetNextInvoiceNumber: vi.fn().mockResolvedValue("INV-2026-001"),
  };
});

vi.mock("@/lib/prisma", () => ({ prisma: mocks.mockPrisma }));
vi.mock("@/lib/auth-user", () => ({
  getSessionUser: () => mocks.mockGetSessionUser(),
  ensureAppUser: (user: unknown) => mocks.mockEnsureAppUser(user),
}));
vi.mock("@/lib/next-invoice-number", () => ({
  getNextInvoiceNumber: (...args: unknown[]) =>
    mocks.mockGetNextInvoiceNumber(...args),
}));

import { POST } from "@/app/api/invoices/route";

describe("POST /api/invoices", () => {
  beforeEach(() => {
    mocks.mockPrisma.reset();
    mocks.mockGetSessionUser.mockReset();
    mocks.mockEnsureAppUser.mockReset();
    mocks.mockGetNextInvoiceNumber.mockResolvedValue("INV-2026-001");
    mocks.mockGetSessionUser.mockResolvedValue(createSupabaseUser({ id: USER_ID }));
    mocks.mockPrisma.seedUser(createDefaultUser());
    mocks.mockPrisma.seedCustomer(createDefaultCustomer());
  });

  it("returns 401 when unauthenticated", async () => {
    mocks.mockGetSessionUser.mockResolvedValue(null);
    const res = await POST(
      new Request("http://localhost/api/invoices", {
        method: "POST",
        body: JSON.stringify(validCreateBody()),
      }),
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid JSON", async () => {
    const res = await POST(
      new Request("http://localhost/api/invoices", {
        method: "POST",
        body: "{",
      }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when customer is missing", async () => {
    const res = await POST(
      new Request("http://localhost/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          issueDate: "2026-08-29",
          dueDate: "2026-09-28",
          lines: validCreateBody().lines,
          discountMode: "flat",
          discountValue: 0,
        }),
      }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 for empty line totals", async () => {
    const res = await POST(
      new Request("http://localhost/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...validCreateBody(),
          lines: [{ productName: "Free", quantity: 1, unitPrice: 0, taxRate: 0 }],
        }),
      }),
    );
    expect(res.status).toBe(400);
    const json = (await res.json()) as { error: string | Record<string, unknown> };
    const message =
      typeof json.error === "string" ? json.error : JSON.stringify(json.error);
    expect(message.toLowerCase()).toContain("line");
  });

  it("returns 403 when customer does not belong to user", async () => {
    const res = await POST(
      new Request("http://localhost/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...validCreateBody(),
          customerId: "44444444-4444-4444-8444-444444444444",
        }),
      }),
    );
    expect(res.status).toBe(403);
  });

  it("creates a draft invoice for existing customer", async () => {
    mocks.mockPrisma.seedCustomer(
      createDefaultCustomer({
        id: CUSTOMER_ID,
        stateCode: null,
        gstNumber: "27AABCU9603R1ZM",
      }),
    );
    mocks.mockPrisma.seedUser(
      createDefaultUser({
        stateCode: null,
        gstNumber: "27AABCU9603R1ZM",
      }),
    );

    const res = await POST(
      new Request("http://localhost/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validCreateBody()),
      }),
    );

    const json = (await res.json()) as {
      invoice: { id: string; invoiceNumber: string; totalAmount: string };
    };

    expect(res.status).toBe(200);
    expect(json.invoice.invoiceNumber).toBe("INV-2026-001");
    expect(Number(json.invoice.totalAmount)).toBeGreaterThan(0);
    expect(mocks.mockGetNextInvoiceNumber).toHaveBeenCalled();
  });

  it("creates invoice with inline new customer", async () => {
    const res = await POST(
      new Request("http://localhost/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newCustomer: {
            name: "Inline Customer",
            gstNumber: "27AABCU9603R1ZM",
          },
          issueDate: "2026-08-29",
          dueDate: "2026-09-28",
          lines: validCreateBody().lines,
          discountMode: "flat",
          discountValue: 0,
        }),
      }),
    );

    expect(res.status).toBe(200);
    const json = (await res.json()) as { invoice: { id: string } };
    expect(json.invoice.id).toMatch(/^invoice-/);
  });

  it("creates invoice with inline customer using email", async () => {
    const res = await POST(
      new Request("http://localhost/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newCustomer: {
            name: "Inline Customer",
            email: "inline@example.com",
            gstNumber: "27AABCU9603R1ZM",
          },
          issueDate: "2026-08-29",
          dueDate: "2026-09-28",
          lines: validCreateBody().lines,
          discountMode: "flat",
          discountValue: 0,
        }),
      }),
    );

    expect(res.status).toBe(200);
    const json = (await res.json()) as { invoice: { id: string } };
    expect(json.invoice.id).toMatch(/^invoice-/);
  });

  it("creates invoice under composition scheme", async () => {
    mocks.mockPrisma.seedUser(
      createDefaultUser({ gstScheme: "composition", stateCode: "27" }),
    );

    const res = await POST(
      new Request("http://localhost/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validCreateBody()),
      }),
    );

    expect(res.status).toBe(200);
  });

  it("returns 409 when inline customer duplicates email", async () => {
    mocks.mockPrisma.seedCustomer(
      createDefaultCustomer({
        id: OTHER_CUSTOMER_ID,
        email: "dup@example.com",
      }),
    );

    const res = await POST(
      new Request("http://localhost/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newCustomer: {
            name: "Dup Customer",
            email: "dup@example.com",
          },
          issueDate: "2026-08-29",
          dueDate: "2026-09-28",
          lines: validCreateBody().lines,
          discountMode: "flat",
          discountValue: 0,
        }),
      }),
    );

    expect(res.status).toBe(409);
  });

  it("returns 409 when inline customer duplicates phone", async () => {
    mocks.mockPrisma.seedCustomer(
      createDefaultCustomer({
        id: OTHER_CUSTOMER_ID,
        phone: "8888888888",
      }),
    );

    const res = await POST(
      new Request("http://localhost/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newCustomer: {
            name: "Phone Dup",
            phone: "8888888888",
          },
          issueDate: "2026-08-29",
          dueDate: "2026-09-28",
          lines: validCreateBody().lines,
          discountMode: "flat",
          discountValue: 0,
        }),
      }),
    );

    expect(res.status).toBe(409);
  });

  it("throws when inline customer create returns no id", async () => {
    mocks.mockPrisma.customer.create.mockImplementationOnce(
      async ({ data }: { data: Record<string, unknown> }) => ({ ...data }),
    );

    await expect(
      POST(
        new Request("http://localhost/api/invoices", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            newCustomer: { name: "No Id Customer" },
            issueDate: "2026-08-29",
            dueDate: "2026-09-28",
            lines: validCreateBody().lines,
            discountMode: "flat",
            discountValue: 0,
          }),
        }),
      ),
    ).rejects.toThrow("Customer required");
  });

  it("rethrows unexpected transaction errors", async () => {
    mocks.mockPrisma.$transaction.mockRejectedValueOnce(new Error("db exploded"));

    await expect(
      POST(
        new Request("http://localhost/api/invoices", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(validCreateBody()),
        }),
      ),
    ).rejects.toThrow("db exploded");
  });
});
