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

import { GET, PATCH } from "@/app/api/customers/[id]/route";

const USER_ID = "customers-user-1";
const CUSTOMER_ID = "customer-abc-1";

function params(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("GET /api/customers/[id]", () => {
  beforeEach(() => {
    mocks.mockPrisma.reset();
    mocks.mockGetSessionUser.mockReset();
    mocks.mockEnsureAppUser.mockReset();
    mocks.mockGetSessionUser.mockResolvedValue(createSupabaseUser({ id: USER_ID }));
  });

  it("returns 401 when unauthenticated", async () => {
    mocks.mockGetSessionUser.mockResolvedValue(null);
    const res = await GET(new Request("http://localhost"), params(CUSTOMER_ID));
    expect(res.status).toBe(401);
  });

  it("returns 404 when customer not found", async () => {
    const res = await GET(new Request("http://localhost"), params(CUSTOMER_ID));
    expect(res.status).toBe(404);
  });

  it("returns 404 when customer belongs to another user", async () => {
    mocks.mockPrisma.seed(
      createDefaultCustomer({
        id: CUSTOMER_ID,
        userId: "other-user",
        name: "Other",
      }),
    );
    const res = await GET(new Request("http://localhost"), params(CUSTOMER_ID));
    expect(res.status).toBe(404);
  });

  it("returns customer details", async () => {
    mocks.mockPrisma.seed(
      createDefaultCustomer({
        id: CUSTOMER_ID,
        userId: USER_ID,
        name: "Acme",
        email: "acme@example.com",
        address: "Pune",
        stateCode: "27",
      }),
    );

    const res = await GET(new Request("http://localhost"), params(CUSTOMER_ID));
    const json = (await res.json()) as {
      customer: { name: string; address: string | null; stateCode: string | null };
    };

    expect(res.status).toBe(200);
    expect(json.customer.name).toBe("Acme");
    expect(json.customer.address).toBe("Pune");
    expect(json.customer.stateCode).toBe("27");
  });
});

describe("PATCH /api/customers/[id]", () => {
  beforeEach(() => {
    mocks.mockPrisma.reset();
    mocks.mockGetSessionUser.mockReset();
    mocks.mockEnsureAppUser.mockReset();
    mocks.mockGetSessionUser.mockResolvedValue(createSupabaseUser({ id: USER_ID }));
    mocks.mockPrisma.seed(
      createDefaultCustomer({
        id: CUSTOMER_ID,
        userId: USER_ID,
        name: "Acme",
        email: "old@example.com",
        gstNumber: "27AABCU9603R1ZM",
        stateCode: "27",
      }),
    );
  });

  it("returns 401 when unauthenticated", async () => {
    mocks.mockGetSessionUser.mockResolvedValue(null);
    const res = await PATCH(
      new Request("http://localhost", {
        method: "PATCH",
        body: JSON.stringify({ name: "New" }),
      }),
      params(CUSTOMER_ID),
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid JSON", async () => {
    const res = await PATCH(
      new Request("http://localhost", { method: "PATCH", body: "{" }),
      params(CUSTOMER_ID),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid email", async () => {
    const res = await PATCH(
      new Request("http://localhost", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "bad" }),
      }),
      params(CUSTOMER_ID),
    );
    expect(res.status).toBe(400);
  });

  it("returns 404 when customer not found", async () => {
    const res = await PATCH(
      new Request("http://localhost", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "New" }),
      }),
      params("missing-id"),
    );
    expect(res.status).toBe(404);
  });

  it("updates customer fields and clears email with empty string", async () => {
    const res = await PATCH(
      new Request("http://localhost", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Acme Updated",
          email: "",
          phone: "1234567890",
          address: "Mumbai",
        }),
      }),
      params(CUSTOMER_ID),
    );

    const json = (await res.json()) as {
      customer: {
        name: string;
        email: string | null;
        phone: string | null;
        address: string | null;
      };
    };

    expect(res.status).toBe(200);
    expect(json.customer.name).toBe("Acme Updated");
    expect(json.customer.email).toBeNull();
    expect(json.customer.phone).toBe("1234567890");
    expect(json.customer.address).toBe("Mumbai");
  });

  it("derives state from updated GSTIN when stateCode omitted", async () => {
    const res = await PATCH(
      new Request("http://localhost", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gstNumber: "07AAAAA0000A1Z5" }),
      }),
      params(CUSTOMER_ID),
    );

    const json = (await res.json()) as {
      customer: { gstNumber: string | null; stateCode: string | null };
    };

    expect(res.status).toBe(200);
    expect(json.customer.gstNumber).toBe("07AAAAA0000A1Z5");
    expect(json.customer.stateCode).toBe("07");
  });

  it("keeps existing state when gst cleared and stateCode not sent", async () => {
    const res = await PATCH(
      new Request("http://localhost", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Renamed Only" }),
      }),
      params(CUSTOMER_ID),
    );

    const json = (await res.json()) as {
      customer: { name: string; stateCode: string | null };
    };

    expect(res.status).toBe(200);
    expect(json.customer.name).toBe("Renamed Only");
    expect(json.customer.stateCode).toBe("27");
  });

  it("clears phone and address when whitespace-only strings are sent", async () => {
    const res = await PATCH(
      new Request("http://localhost", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: "   ", address: "  " }),
      }),
      params(CUSTOMER_ID),
    );

    const json = (await res.json()) as {
      customer: { phone: string | null; address: string | null };
    };

    expect(res.status).toBe(200);
    expect(json.customer.phone).toBeNull();
    expect(json.customer.address).toBeNull();
  });

  it("uses state from existing GSTIN when gstNumber cleared but update triggers state recompute", async () => {
    const res = await PATCH(
      new Request("http://localhost", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gstNumber: "", stateCode: "" }),
      }),
      params(CUSTOMER_ID),
    );

    const json = (await res.json()) as {
      customer: { gstNumber: string | null; stateCode: string | null };
    };

    expect(res.status).toBe(200);
    expect(json.customer.gstNumber).toBeNull();
    expect(json.customer.stateCode).toBe("27");
  });
});
