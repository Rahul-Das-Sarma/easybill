import { http, HttpResponse } from "msw";

import type { MockUserRow } from "../auth-store";

export const AUTH_API_BASE = "http://test.local";

type OnboardingProfile = Pick<
  MockUserRow,
  | "businessType"
  | "businessTypeChosen"
  | "onboardingCompleted"
  | "companyName"
  | "address"
  | "phone"
  | "invoicePrefix"
  | "gstScheme"
  | "gstNumber"
  | "stateCode"
>;

const users = new Map<string, MockUserRow>();

function requireUser(request: Request): MockUserRow | Response {
  const auth = request.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) {
    return HttpResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const id = auth.slice("Bearer ".length);
  const row = users.get(id);
  if (!row) {
    return HttpResponse.json({ error: "Not found" }, { status: 404 });
  }
  return row;
}

function onboardingPayload(row: MockUserRow) {
  const profile: OnboardingProfile = {
    businessType: row.businessType,
    businessTypeChosen: row.businessTypeChosen,
    onboardingCompleted: row.onboardingCompleted,
    companyName: row.companyName,
    address: row.address,
    phone: row.phone,
    invoicePrefix: row.invoicePrefix,
    gstScheme: row.gstScheme,
    gstNumber: row.gstNumber,
    stateCode: row.stateCode,
  };
  return {
    onboardingCompleted: row.onboardingCompleted,
    profile,
    isManufacturer: row.businessType === "manufacturer",
  };
}

export function resetAuthOnboardingStore() {
  users.clear();
}

export function seedAuthOnboardingUser(row: MockUserRow) {
  users.set(row.id, row);
}

/** MSW handlers mirroring /api/me and /api/onboarding contracts. */
export const authOnboardingHandlers = [
  http.get(`${AUTH_API_BASE}/api/me`, ({ request }) => {
    const row = requireUser(request);
    if (row instanceof Response) return row;

    return HttpResponse.json({
      businessType: row.businessType,
      businessTypeChosen: row.businessTypeChosen,
      onboardingCompleted: row.onboardingCompleted,
      isManufacturer: row.businessType === "manufacturer",
      companyName: row.companyName,
    });
  }),

  http.patch(`${AUTH_API_BASE}/api/me`, async ({ request }) => {
    const row = requireUser(request);
    if (row instanceof Response) return row;

    let body: { businessType?: string };
    try {
      body = (await request.json()) as { businessType?: string };
    } catch {
      return HttpResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    if (body.businessType !== "trading" && body.businessType !== "manufacturer") {
      return HttpResponse.json({ error: "Invalid business type" }, { status: 400 });
    }

    row.businessType = body.businessType;
    row.businessTypeChosen = true;
    users.set(row.id, row);

    return HttpResponse.json({
      businessType: row.businessType,
      businessTypeChosen: row.businessTypeChosen,
      isManufacturer: row.businessType === "manufacturer",
    });
  }),

  http.get(`${AUTH_API_BASE}/api/onboarding`, ({ request }) => {
    const row = requireUser(request);
    if (row instanceof Response) return row;
    return HttpResponse.json(onboardingPayload(row));
  }),

  http.post(`${AUTH_API_BASE}/api/onboarding`, async ({ request }) => {
    const row = requireUser(request);
    if (row instanceof Response) return row;

    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return HttpResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const businessType = body.businessType;
    const companyName = body.companyName;
    const address = body.address;
    const invoicePrefix = body.invoicePrefix;
    const gstScheme = body.gstScheme;

    if (
      (businessType !== "trading" && businessType !== "manufacturer") ||
      typeof companyName !== "string" ||
      !companyName.trim() ||
      typeof address !== "string" ||
      !address.trim() ||
      typeof invoicePrefix !== "string" ||
      !invoicePrefix.trim() ||
      (gstScheme !== "regular" &&
        gstScheme !== "composition" &&
        gstScheme !== "unregistered")
    ) {
      return HttpResponse.json({ error: "Validation failed" }, { status: 400 });
    }

    row.businessType = businessType;
    row.businessTypeChosen = true;
    row.onboardingCompleted = true;
    row.companyName = companyName.trim();
    row.address = address.trim();
    row.phone =
      typeof body.phone === "string" && body.phone.trim()
        ? body.phone.trim()
        : null;
    row.invoicePrefix = invoicePrefix.trim().toUpperCase();
    row.gstScheme = gstScheme;
    row.gstNumber =
      typeof body.gstNumber === "string" && body.gstNumber.trim()
        ? body.gstNumber.trim()
        : null;
    row.stateCode =
      typeof body.stateCode === "string" && body.stateCode.trim()
        ? body.stateCode.trim()
        : row.gstNumber?.slice(0, 2) ?? null;

    users.set(row.id, row);

    return HttpResponse.json({
      onboardingCompleted: true,
      profile: onboardingPayload(row).profile,
      isManufacturer: row.businessType === "manufacturer",
    });
  }),
];
