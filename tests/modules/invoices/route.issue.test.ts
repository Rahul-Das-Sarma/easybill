import { beforeEach, describe, expect, it, vi } from "vitest";

import { createSupabaseUser } from "../../mocks/auth-store";
import {
  createMockInvoice,
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

import { POST } from "@/app/api/invoices/[id]/issue/route";

import { USER_ID } from "../../mocks/invoice-store";

const INVOICE_ID = "invoice-issue-1";

function params(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("POST /api/invoices/[id]/issue", () => {
  beforeEach(() => {
    mocks.mockPrisma.reset();
    mocks.mockGetSessionUser.mockReset();
    mocks.mockGetSessionUser.mockResolvedValue(createSupabaseUser({ id: USER_ID }));
  });

  it("returns 401 when unauthenticated", async () => {
    mocks.mockGetSessionUser.mockResolvedValue(null);
    const res = await POST(new Request("http://localhost"), params(INVOICE_ID));
    expect(res.status).toBe(401);
  });

  it("returns 404 when invoice not found", async () => {
    const res = await POST(new Request("http://localhost"), params(INVOICE_ID));
    expect(res.status).toBe(404);
  });

  it("returns 400 when invoice is not draft", async () => {
    mocks.mockPrisma.seedInvoice(
      createMockInvoice({
        id: INVOICE_ID,
        invoiceNumber: "INV-P",
        status: "pending",
      }),
    );

    const res = await POST(new Request("http://localhost"), params(INVOICE_ID));
    expect(res.status).toBe(400);
    const json = (await res.json()) as { error: string };
    expect(json.error).toContain("draft");
  });

  it("issues draft invoice as pending", async () => {
    mocks.mockPrisma.seedInvoice(
      createMockInvoice({
        id: INVOICE_ID,
        invoiceNumber: "INV-D",
        status: "draft",
      }),
    );

    const res = await POST(new Request("http://localhost"), params(INVOICE_ID));
    const json = (await res.json()) as { invoice: { status: string } };

    expect(res.status).toBe(200);
    expect(json.invoice.status).toBe("pending");
    expect(mocks.mockPrisma._invoices.get(INVOICE_ID)?.status).toBe("pending");
  });
});
