import { beforeEach, describe, expect, it, vi } from "vitest";

import { createDefaultUserRow, createSupabaseUser } from "../../mocks/auth-store";

const mocks = vi.hoisted(() => {
  const { createRequire } = require("node:module") as typeof import("node:module");
  const req = createRequire(import.meta.url);
  const { createMockPrisma } =
    req("../../mocks/auth-store.ts") as typeof import("../../mocks/auth-store");
  return {
    mockPrisma: createMockPrisma(),
    mockGetSessionUser: vi.fn(),
    mockEnsureAppUser: vi.fn(),
  };
});

vi.mock("@/lib/prisma", () => ({ prisma: mocks.mockPrisma }));
vi.mock("@/lib/auth-user", () => ({
  getSessionUser: () => mocks.mockGetSessionUser(),
  ensureAppUser: (user: unknown) => mocks.mockEnsureAppUser(user),
}));

import { GET, PATCH } from "@/app/api/me/route";

const USER_ID = "me-user-1";

describe("GET /api/me", () => {
  beforeEach(() => {
    mocks.mockPrisma.reset();
    mocks.mockGetSessionUser.mockReset();
    mocks.mockEnsureAppUser.mockReset();
  });

  it("returns 401 when unauthenticated", async () => {
    mocks.mockGetSessionUser.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns 404 when user row is missing", async () => {
    mocks.mockGetSessionUser.mockResolvedValue(createSupabaseUser({ id: USER_ID }));
    const res = await GET();
    expect(res.status).toBe(404);
  });

  it("returns lightweight profile", async () => {
    mocks.mockGetSessionUser.mockResolvedValue(createSupabaseUser({ id: USER_ID }));
    mocks.mockPrisma.seed(
      createDefaultUserRow({
        id: USER_ID,
        businessType: "manufacturer",
        businessTypeChosen: true,
        onboardingCompleted: true,
        companyName: "Make Co",
      }),
    );

    const res = await GET();
    const json = (await res.json()) as {
      businessType: string;
      isManufacturer: boolean;
      companyName: string;
    };

    expect(res.status).toBe(200);
    expect(json.businessType).toBe("manufacturer");
    expect(json.isManufacturer).toBe(true);
    expect(json.companyName).toBe("Make Co");
  });
});

describe("PATCH /api/me", () => {
  beforeEach(() => {
    mocks.mockPrisma.reset();
    mocks.mockGetSessionUser.mockReset();
    mocks.mockEnsureAppUser.mockReset();
    mocks.mockPrisma.seed(createDefaultUserRow({ id: USER_ID }));
    mocks.mockGetSessionUser.mockResolvedValue(createSupabaseUser({ id: USER_ID }));
  });

  it("returns 401 when unauthenticated", async () => {
    mocks.mockGetSessionUser.mockResolvedValue(null);
    const res = await PATCH(
      new Request("http://localhost/api/me", {
        method: "PATCH",
        body: JSON.stringify({ businessType: "trading" }),
      }),
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid JSON", async () => {
    const res = await PATCH(
      new Request("http://localhost/api/me", {
        method: "PATCH",
        body: "{",
      }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid business type", async () => {
    const res = await PATCH(
      new Request("http://localhost/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessType: "retail" }),
      }),
    );
    expect(res.status).toBe(400);
    const json = (await res.json()) as { error: string };
    expect(json.error).toBe("Invalid business type");
  });

  it("updates business type to trading", async () => {
    const res = await PATCH(
      new Request("http://localhost/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessType: "trading" }),
      }),
    );

    const json = (await res.json()) as {
      businessType: string;
      businessTypeChosen: boolean;
      isManufacturer: boolean;
    };

    expect(res.status).toBe(200);
    expect(json.businessType).toBe("trading");
    expect(json.businessTypeChosen).toBe(true);
    expect(json.isManufacturer).toBe(false);
  });

  it("updates business type to manufacturer", async () => {
    const res = await PATCH(
      new Request("http://localhost/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessType: "manufacturer" }),
      }),
    );

    const json = (await res.json()) as { isManufacturer: boolean };
    expect(res.status).toBe(200);
    expect(json.isManufacturer).toBe(true);
  });
});
