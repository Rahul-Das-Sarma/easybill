import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { createSupabaseUser } from "../../mocks/auth-store";
import {
  createDefaultCustomer,
  createDefaultUser,
  createMockInvoice,
  CUSTOMER_ID,
  d,
  USER_ID,
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

import { GET } from "@/app/api/invoices/route";

describe("GET /api/invoices", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-29T12:00:00.000Z"));
    mocks.mockPrisma.reset();
    mocks.mockGetSessionUser.mockReset();
    mocks.mockEnsureAppUser.mockReset();
    mocks.mockGetSessionUser.mockResolvedValue(createSupabaseUser({ id: USER_ID }));
    mocks.mockPrisma.seedUser(createDefaultUser());
    mocks.mockPrisma.seedCustomer(createDefaultCustomer());
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns 401 when unauthenticated", async () => {
    mocks.mockGetSessionUser.mockResolvedValue(null);
    const res = await GET(new Request("http://localhost/api/invoices"));
    expect(res.status).toBe(401);
  });

  it("returns paginated invoice list", async () => {
    mocks.mockPrisma.seedInvoice(
      createMockInvoice({
        id: "inv-1",
        invoiceNumber: "INV-2026-001",
        status: "draft",
        createdAt: new Date("2026-08-28T10:00:00.000Z"),
      }),
    );
    mocks.mockPrisma.seedInvoice(
      createMockInvoice({
        id: "inv-2",
        invoiceNumber: "INV-2026-002",
        status: "paid",
        amountPaid: d(118),
        createdAt: new Date("2026-08-29T10:00:00.000Z"),
      }),
    );

    const res = await GET(new Request("http://localhost/api/invoices?page=1&limit=10"));
    const json = (await res.json()) as {
      items: { invoiceNumber: string; displayStatus: string }[];
      total: number;
      page: number;
      totalPages: number;
    };

    expect(res.status).toBe(200);
    expect(json.total).toBe(2);
    expect(json.items[0]?.invoiceNumber).toBe("INV-2026-002");
    expect(json.items[1]?.invoiceNumber).toBe("INV-2026-001");
    expect(json.page).toBe(1);
    expect(json.totalPages).toBe(1);
  });

  it("filters paid tab", async () => {
    mocks.mockPrisma.seedInvoice(
      createMockInvoice({ id: "inv-paid", invoiceNumber: "INV-P", status: "paid" }),
    );
    mocks.mockPrisma.seedInvoice(
      createMockInvoice({ id: "inv-draft", invoiceNumber: "INV-D", status: "draft" }),
    );

    const res = await GET(new Request("http://localhost/api/invoices?tab=paid"));
    const json = (await res.json()) as { items: unknown[]; total: number };
    expect(json.total).toBe(1);
    expect(json.items).toHaveLength(1);
  });

  it("filters pending tab (unpaid, due today or later)", async () => {
    mocks.mockPrisma.seedInvoice(
      createMockInvoice({
        id: "inv-pending",
        invoiceNumber: "INV-PEN",
        status: "pending",
        dueDate: new Date("2026-09-01T00:00:00.000Z"),
      }),
    );
    mocks.mockPrisma.seedInvoice(
      createMockInvoice({
        id: "inv-overdue",
        invoiceNumber: "INV-OVD",
        status: "pending",
        dueDate: new Date("2026-08-28T00:00:00.000Z"),
      }),
    );

    const res = await GET(new Request("http://localhost/api/invoices?tab=pending"));
    const json = (await res.json()) as { total: number };
    expect(json.total).toBe(1);
  });

  it("filters overdue tab", async () => {
    mocks.mockPrisma.seedInvoice(
      createMockInvoice({
        id: "inv-overdue",
        invoiceNumber: "INV-OVD",
        status: "pending",
        dueDate: new Date("2026-08-28T00:00:00.000Z"),
      }),
    );
    mocks.mockPrisma.seedInvoice(
      createMockInvoice({
        id: "inv-future",
        invoiceNumber: "INV-FUT",
        status: "pending",
        dueDate: new Date("2026-09-01T00:00:00.000Z"),
      }),
    );

    const res = await GET(new Request("http://localhost/api/invoices?tab=overdue"));
    const json = (await res.json()) as { total: number };
    expect(json.total).toBe(1);
  });

  it("searches by invoice number and amount", async () => {
    mocks.mockPrisma.seedInvoice(
      createMockInvoice({
        id: "inv-search",
        invoiceNumber: "INV-2026-100",
        totalAmount: d(500),
      }),
    );
    mocks.mockPrisma.seedInvoice(
      createMockInvoice({
        id: "inv-other",
        invoiceNumber: "INV-2026-200",
        totalAmount: d(999),
      }),
    );

    const byNumber = await GET(
      new Request("http://localhost/api/invoices?q=100"),
    );
    const numberJson = (await byNumber.json()) as { total: number };
    expect(numberJson.total).toBe(1);

    const byAmount = await GET(
      new Request("http://localhost/api/invoices?q=500"),
    );
    const amountJson = (await byAmount.json()) as { total: number };
    expect(amountJson.total).toBe(1);
  });

  it("searches by customer name", async () => {
    mocks.mockPrisma.seedCustomer(
      createDefaultCustomer({ id: CUSTOMER_ID, name: "Unique Buyer Ltd" }),
    );
    mocks.mockPrisma.seedInvoice(
      createMockInvoice({ id: "inv-cust", invoiceNumber: "INV-CUST" }),
    );

    const res = await GET(
      new Request("http://localhost/api/invoices?q=unique%20buyer"),
    );
    const json = (await res.json()) as { total: number };
    expect(json.total).toBe(1);
  });

  it("lists all invoices when tab is unknown", async () => {
    mocks.mockPrisma.seedInvoice(
      createMockInvoice({ id: "inv-a", invoiceNumber: "INV-A", status: "draft" }),
    );
    mocks.mockPrisma.seedInvoice(
      createMockInvoice({ id: "inv-b", invoiceNumber: "INV-B", status: "paid" }),
    );

    const res = await GET(new Request("http://localhost/api/invoices?tab=unknown"));
    const json = (await res.json()) as { total: number };
    expect(json.total).toBe(2);
  });

  it("uses default pagination for invalid query params", async () => {
    mocks.mockPrisma.seedInvoice(
      createMockInvoice({ id: "inv-page", invoiceNumber: "INV-PAGE" }),
    );

    const res = await GET(
      new Request("http://localhost/api/invoices?page=0&limit=999"),
    );
    const json = (await res.json()) as { page: number; limit: number };
    expect(res.status).toBe(200);
    expect(json.page).toBe(1);
    expect(json.limit).toBe(50);
  });
});
