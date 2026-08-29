import { beforeEach, describe, expect, it, vi } from "vitest";

import { createSupabaseUser } from "../../mocks/auth-store";

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

import { POST } from "@/app/api/customers/route";

import {
  createDefaultCustomer,
} from "../../mocks/customer-store";

const USER_ID = "customers-user-1";

describe("POST /api/customers", () => {
  beforeEach(() => {
    mocks.mockPrisma.reset();
    mocks.mockGetSessionUser.mockReset();
    mocks.mockEnsureAppUser.mockReset();
    mocks.mockGetSessionUser.mockResolvedValue(createSupabaseUser({ id: USER_ID }));
  });

  it("returns 401 when unauthenticated", async () => {
    mocks.mockGetSessionUser.mockResolvedValue(null);
    const res = await POST(
      new Request("http://localhost/api/customers", {
        method: "POST",
        body: JSON.stringify({ name: "Acme" }),
      }),
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid JSON", async () => {
    const res = await POST(
      new Request("http://localhost/api/customers", {
        method: "POST",
        body: "not-json",
      }),
    );
    expect(res.status).toBe(400);
    const json = (await res.json()) as { error: string };
    expect(json.error).toBe("Invalid JSON");
  });

  it("returns 400 when name is missing", async () => {
    const res = await POST(
      new Request("http://localhost/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "" }),
      }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid email", async () => {
    const res = await POST(
      new Request("http://localhost/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Acme", email: "not-an-email" }),
      }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 409 when email already exists for user", async () => {
    mocks.mockPrisma.seed(
      createDefaultCustomer({
        id: "existing-1",
        userId: USER_ID,
        name: "Existing",
        email: "dup@example.com",
      }),
    );

    const res = await POST(
      new Request("http://localhost/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "New Co",
          email: "dup@example.com",
        }),
      }),
    );

    expect(res.status).toBe(409);
    const json = (await res.json()) as { error: string };
    expect(json.error).toContain("already exists");
  });

  it("returns 409 when phone already exists for user", async () => {
    mocks.mockPrisma.seed(
      createDefaultCustomer({
        id: "existing-2",
        userId: USER_ID,
        name: "Existing",
        phone: "9999999999",
      }),
    );

    const res = await POST(
      new Request("http://localhost/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "New Co",
          phone: "9999999999",
        }),
      }),
    );

    expect(res.status).toBe(409);
  });

  it("creates customer and derives state from GSTIN", async () => {
    const res = await POST(
      new Request("http://localhost/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Acme Traders",
          email: "acme@example.com",
          phone: "9876543210",
          address: "Pune",
          gstNumber: "27AABCU9603R1ZM",
        }),
      }),
    );

    const json = (await res.json()) as {
      customer: {
        name: string;
        email: string;
        stateCode: string | null;
        gstNumber: string | null;
      };
    };

    expect(res.status).toBe(200);
    expect(json.customer.name).toBe("Acme Traders");
    expect(json.customer.email).toBe("acme@example.com");
    expect(json.customer.stateCode).toBe("27");
    expect(json.customer.gstNumber).toBe("27AABCU9603R1ZM");
    expect(mocks.mockEnsureAppUser).toHaveBeenCalled();
  });

  it("treats empty email string as null and skips duplicate check", async () => {
    const res = await POST(
      new Request("http://localhost/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "No Email Co",
          email: "",
        }),
      }),
    );

    expect(res.status).toBe(200);
    const json = (await res.json()) as { customer: { email: string | null } };
    expect(json.customer.email).toBeNull();
  });

  it("uses explicit stateCode when provided", async () => {
    const res = await POST(
      new Request("http://localhost/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Tamil Co",
          stateCode: "33",
        }),
      }),
    );

    const json = (await res.json()) as { customer: { stateCode: string | null } };
    expect(res.status).toBe(200);
    expect(json.customer.stateCode).toBe("33");
  });
});
