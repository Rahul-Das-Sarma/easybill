import { beforeEach, describe, expect, it, vi } from "vitest";

import { createSupabaseUser } from "../../mocks/auth-store";
import {
  createDefaultCustomer,
} from "../../mocks/customer-store";

const mocks = vi.hoisted(() => {
  const { createRequire } = require("node:module") as typeof import("node:module");
  const req = createRequire(import.meta.url);
  const { createMockCustomerPrisma } =
    req("../../mocks/customer-store.ts") as typeof import("../../mocks/customer-store");
  return {
    mockPrisma: createMockCustomerPrisma(),
    mockGetSessionUser: vi.fn(),
    mockEnsureAppUser: vi.fn(),
  };
});

vi.mock("@/lib/prisma", () => ({ prisma: mocks.mockPrisma }));
vi.mock("@/lib/auth-user", () => ({
  getSessionUser: () => mocks.mockGetSessionUser(),
  ensureAppUser: (user: unknown) => mocks.mockEnsureAppUser(user),
}));

import { GET } from "@/app/api/customers/search/route";

const USER_ID = "customers-user-1";
const OTHER_USER_ID = "customers-user-2";

describe("GET /api/customers/search", () => {
  beforeEach(() => {
    mocks.mockPrisma.reset();
    mocks.mockGetSessionUser.mockReset();
    mocks.mockEnsureAppUser.mockReset();
    mocks.mockGetSessionUser.mockResolvedValue(createSupabaseUser({ id: USER_ID }));
  });

  it("returns 401 when unauthenticated", async () => {
    mocks.mockGetSessionUser.mockResolvedValue(null);
    const res = await GET(new Request("http://localhost/api/customers/search"));
    expect(res.status).toBe(401);
  });

  it("returns all customers for user when q is empty", async () => {
    mocks.mockPrisma.seed(
      createDefaultCustomer({
        id: "c-1",
        userId: USER_ID,
        name: "Zebra Corp",
      }),
    );
    mocks.mockPrisma.seed(
      createDefaultCustomer({
        id: "c-2",
        userId: USER_ID,
        name: "Alpha Inc",
      }),
    );
    mocks.mockPrisma.seed(
      createDefaultCustomer({
        id: "c-3",
        userId: OTHER_USER_ID,
        name: "Other User Co",
      }),
    );

    const res = await GET(new Request("http://localhost/api/customers/search"));
    const json = (await res.json()) as { customers: { name: string }[] };

    expect(res.status).toBe(200);
    expect(json.customers).toHaveLength(2);
    expect(json.customers[0]?.name).toBe("Alpha Inc");
    expect(json.customers[1]?.name).toBe("Zebra Corp");
  });

  it("filters customers by search query", async () => {
    mocks.mockPrisma.seed(
      createDefaultCustomer({
        id: "c-1",
        userId: USER_ID,
        name: "Acme Traders",
        email: "acme@example.com",
      }),
    );
    mocks.mockPrisma.seed(
      createDefaultCustomer({
        id: "c-2",
        userId: USER_ID,
        name: "Beta LLC",
        gstNumber: "27AABCU9603R1ZM",
      }),
    );

    const res = await GET(
      new Request("http://localhost/api/customers/search?q=acme"),
    );
    const json = (await res.json()) as { customers: { name: string }[] };

    expect(res.status).toBe(200);
    expect(json.customers).toHaveLength(1);
    expect(json.customers[0]?.name).toBe("Acme Traders");
  });

  it("matches phone and gst in search", async () => {
    mocks.mockPrisma.seed(
      createDefaultCustomer({
        id: "c-1",
        userId: USER_ID,
        name: "Phone Co",
        phone: "9876543210",
      }),
    );
    mocks.mockPrisma.seed(
      createDefaultCustomer({
        id: "c-2",
        userId: USER_ID,
        name: "GST Co",
        gstNumber: "07AAAAA0000A1Z5",
      }),
    );

    const phoneRes = await GET(
      new Request("http://localhost/api/customers/search?q=9876"),
    );
    const phoneJson = (await phoneRes.json()) as { customers: { name: string }[] };
    expect(phoneJson.customers).toHaveLength(1);
    expect(phoneJson.customers[0]?.name).toBe("Phone Co");

    const gstRes = await GET(
      new Request("http://localhost/api/customers/search?q=07AAAA"),
    );
    const gstJson = (await gstRes.json()) as { customers: { name: string }[] };
    expect(gstJson.customers).toHaveLength(1);
    expect(gstJson.customers[0]?.name).toBe("GST Co");
  });
});
