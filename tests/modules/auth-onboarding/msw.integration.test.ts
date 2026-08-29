import { beforeEach, describe, expect, it } from "vitest";

import { createDefaultUserRow } from "../../mocks/auth-store";
import {
  AUTH_API_BASE,
  resetAuthOnboardingStore,
  seedAuthOnboardingUser,
} from "../../mocks/handlers/auth-onboarding";

const USER_ID = "msw-auth-user-1";
const AUTH = { Authorization: `Bearer ${USER_ID}` };

describe("Auth & onboarding — MSW mock server integration", () => {
  beforeEach(() => {
    resetAuthOnboardingStore();
    seedAuthOnboardingUser(
      createDefaultUserRow({
        id: USER_ID,
        companyName: "Starter Co",
        onboardingCompleted: false,
      }),
    );
  });

  it("GET /api/me returns profile for authenticated user", async () => {
    const res = await fetch(`${AUTH_API_BASE}/api/me`, { headers: AUTH });
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      companyName: string;
      onboardingCompleted: boolean;
    };
    expect(json.companyName).toBe("Starter Co");
    expect(json.onboardingCompleted).toBe(false);
  });

  it("GET /api/me returns 401 without auth header", async () => {
    const res = await fetch(`${AUTH_API_BASE}/api/me`);
    expect(res.status).toBe(401);
  });

  it("PATCH /api/me updates business type", async () => {
    const res = await fetch(`${AUTH_API_BASE}/api/me`, {
      method: "PATCH",
      headers: { ...AUTH, "Content-Type": "application/json" },
      body: JSON.stringify({ businessType: "manufacturer" }),
    });

    expect(res.status).toBe(200);
    const json = (await res.json()) as { isManufacturer: boolean };
    expect(json.isManufacturer).toBe(true);

    const check = await fetch(`${AUTH_API_BASE}/api/me`, { headers: AUTH });
    const profile = (await check.json()) as { isManufacturer: boolean };
    expect(profile.isManufacturer).toBe(true);
  });

  it("GET /api/onboarding returns onboarding payload", async () => {
    const res = await fetch(`${AUTH_API_BASE}/api/onboarding`, {
      headers: AUTH,
    });
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      onboardingCompleted: boolean;
      profile: { companyName: string };
    };
    expect(json.onboardingCompleted).toBe(false);
    expect(json.profile.companyName).toBe("Starter Co");
  });

  it("POST /api/onboarding completes setup", async () => {
    const res = await fetch(`${AUTH_API_BASE}/api/onboarding`, {
      method: "POST",
      headers: { ...AUTH, "Content-Type": "application/json" },
      body: JSON.stringify({
        businessType: "trading",
        companyName: "Finished Co",
        address: "Delhi",
        invoicePrefix: "FIN",
        gstScheme: "regular",
        gstNumber: "07AAAAA0000A1Z5",
      }),
    });

    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      onboardingCompleted: boolean;
      profile: { companyName: string; stateCode: string | null };
    };
    expect(json.onboardingCompleted).toBe(true);
    expect(json.profile.companyName).toBe("Finished Co");
    expect(json.profile.stateCode).toBe("07");
  });

  it("POST /api/onboarding returns 400 for invalid payload", async () => {
    const res = await fetch(`${AUTH_API_BASE}/api/onboarding`, {
      method: "POST",
      headers: { ...AUTH, "Content-Type": "application/json" },
      body: JSON.stringify({ businessType: "trading" }),
    });
    expect(res.status).toBe(400);
  });

  it("returns 404 for unknown user id", async () => {
    const res = await fetch(`${AUTH_API_BASE}/api/me`, {
      headers: { Authorization: "Bearer unknown-user" },
    });
    expect(res.status).toBe(404);
  });
});
