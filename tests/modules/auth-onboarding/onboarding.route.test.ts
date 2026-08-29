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

import { GET, POST } from "@/app/api/onboarding/route";

const USER_ID = "onboarding-user-1";

describe("GET /api/onboarding", () => {
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

  it("returns 404 when user row is missing after ensure", async () => {
    mocks.mockGetSessionUser.mockResolvedValue(createSupabaseUser({ id: USER_ID }));
    const res = await GET();
    expect(res.status).toBe(404);
  });

  it("returns onboarding profile for authenticated user", async () => {
    mocks.mockGetSessionUser.mockResolvedValue(createSupabaseUser({ id: USER_ID }));
    mocks.mockPrisma.seed(
      createDefaultUserRow({
        id: USER_ID,
        businessType: "manufacturer",
        onboardingCompleted: false,
      }),
    );

    const res = await GET();
    const json = (await res.json()) as {
      onboardingCompleted: boolean;
      isManufacturer: boolean;
      profile: { businessType: string };
    };

    expect(res.status).toBe(200);
    expect(json.onboardingCompleted).toBe(false);
    expect(json.isManufacturer).toBe(true);
    expect(json.profile.businessType).toBe("manufacturer");
    expect(mocks.mockEnsureAppUser).toHaveBeenCalled();
  });
});

describe("POST /api/onboarding", () => {
  beforeEach(() => {
    mocks.mockPrisma.reset();
    mocks.mockGetSessionUser.mockReset();
    mocks.mockEnsureAppUser.mockReset();
    mocks.mockPrisma.seed(createDefaultUserRow({ id: USER_ID }));
    mocks.mockGetSessionUser.mockResolvedValue(createSupabaseUser({ id: USER_ID }));
  });

  it("returns 401 when unauthenticated", async () => {
    mocks.mockGetSessionUser.mockResolvedValue(null);
    const res = await POST(
      new Request("http://localhost/api/onboarding", {
        method: "POST",
        body: JSON.stringify({}),
      }),
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid JSON", async () => {
    const res = await POST(
      new Request("http://localhost/api/onboarding", {
        method: "POST",
        body: "not-json",
      }),
    );
    expect(res.status).toBe(400);
    const json = (await res.json()) as { error: string };
    expect(json.error).toBe("Invalid JSON");
  });

  it("returns 400 for validation errors", async () => {
    const res = await POST(
      new Request("http://localhost/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessType: "invalid",
          companyName: "",
        }),
      }),
    );
    expect(res.status).toBe(400);
  });

  it("completes onboarding and derives state from GSTIN", async () => {
    const res = await POST(
      new Request("http://localhost/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessType: "trading",
          companyName: "Acme Traders",
          address: "Pune, MH",
          phone: "9876543210",
          invoicePrefix: "acme-1",
          gstScheme: "regular",
          gstNumber: "27AABCU9603R1ZM",
        }),
      }),
    );

    const json = (await res.json()) as {
      onboardingCompleted: boolean;
      isManufacturer: boolean;
      profile: {
        companyName: string;
        invoicePrefix: string;
        stateCode: string | null;
        onboardingCompleted: boolean;
      };
    };

    expect(res.status).toBe(200);
    expect(json.onboardingCompleted).toBe(true);
    expect(json.isManufacturer).toBe(false);
    expect(json.profile.companyName).toBe("Acme Traders");
    expect(json.profile.invoicePrefix).toBe("ACME-1");
    expect(json.profile.stateCode).toBe("27");
    expect(json.profile.onboardingCompleted).toBe(true);
  });

  it("accepts explicit stateCode and nullable optional fields", async () => {
    const res = await POST(
      new Request("http://localhost/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessType: "manufacturer",
          companyName: "Make Co",
          address: "Chennai",
          invoicePrefix: "MK",
          gstScheme: "unregistered",
          gstNumber: null,
          stateCode: "33",
          phone: null,
        }),
      }),
    );

    const json = (await res.json()) as {
      isManufacturer: boolean;
      profile: { stateCode: string | null; gstScheme: string };
    };

    expect(res.status).toBe(200);
    expect(json.isManufacturer).toBe(true);
    expect(json.profile.stateCode).toBe("33");
    expect(json.profile.gstScheme).toBe("unregistered");
  });
});
