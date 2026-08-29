import { http, HttpResponse } from "msw";

import type { MockCustomer } from "../customer-store";
import { createDefaultCustomer } from "../customer-store";

export const CUSTOMERS_API_BASE = "http://test.local";

const customers = new Map<string, MockCustomer>();
let nextId = 1;

function requireUser(request: Request): string | Response {
  const auth = request.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) {
    return HttpResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return auth.slice("Bearer ".length);
}

function listForUser(userId: string, q?: string) {
  const rows = [...customers.values()].filter((c) => c.userId === userId);
  if (!q) {
    return rows.sort((a, b) => a.name.localeCompare(b.name)).slice(0, 20);
  }
  const needle = q.toLowerCase();
  return rows
    .filter((c) => {
      return (
        c.name.toLowerCase().includes(needle) ||
        (c.email ?? "").toLowerCase().includes(needle) ||
        (c.phone ?? "").includes(needle) ||
        (c.gstNumber ?? "").toLowerCase().includes(needle)
      );
    })
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, 20);
}

function hasDuplicate(userId: string, email: string | null, phone: string | null) {
  return [...customers.values()].some((c) => {
    if (c.userId !== userId) return false;
    if (email && c.email?.toLowerCase() === email.toLowerCase()) return true;
    if (phone && c.phone === phone) return true;
    return false;
  });
}

export function resetCustomersStore() {
  customers.clear();
  nextId = 1;
}

export function seedCustomer(row: MockCustomer) {
  customers.set(row.id, row);
}

export const customersHandlers = [
  http.get(`${CUSTOMERS_API_BASE}/api/customers/search`, ({ request }) => {
    const userId = requireUser(request);
    if (userId instanceof Response) return userId;

    const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
    const rows = listForUser(userId, q || undefined).map((c) => ({
      id: c.id,
      name: c.name,
      email: c.email,
      phone: c.phone,
      gstNumber: c.gstNumber,
      stateCode: c.stateCode,
    }));
    return HttpResponse.json({ customers: rows });
  }),

  http.post(`${CUSTOMERS_API_BASE}/api/customers`, async ({ request }) => {
    const userId = requireUser(request);
    if (userId instanceof Response) return userId;

    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return HttpResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) {
      return HttpResponse.json({ error: { name: ["Name required"] } }, { status: 400 });
    }

    const email =
      typeof body.email === "string" && body.email.trim()
        ? body.email.trim()
        : null;
    const phone =
      typeof body.phone === "string" && body.phone.trim()
        ? body.phone.trim()
        : null;

    if (hasDuplicate(userId, email, phone)) {
      return HttpResponse.json(
        {
          error:
            "Customer already exists. Use the existing customer (matching email or phone) to avoid duplicates.",
        },
        { status: 409 },
      );
    }

    const gstNumber =
      typeof body.gstNumber === "string" && body.gstNumber.trim()
        ? body.gstNumber.trim().toUpperCase()
        : null;
    const stateCode =
      (typeof body.stateCode === "string" && body.stateCode.trim()) ||
      gstNumber?.slice(0, 2) ||
      null;

    const id = `customer-${nextId++}`;
    const row = createDefaultCustomer({
      id,
      userId,
      name,
      email,
      phone,
      address:
        typeof body.address === "string" && body.address.trim()
          ? body.address.trim()
          : null,
      gstNumber,
      stateCode,
    });
    customers.set(id, row);

    return HttpResponse.json({
      customer: {
        id: row.id,
        name: row.name,
        email: row.email,
        phone: row.phone,
        gstNumber: row.gstNumber,
        stateCode: row.stateCode,
      },
    });
  }),

  http.get(`${CUSTOMERS_API_BASE}/api/customers/:id`, ({ request, params }) => {
    const userId = requireUser(request);
    if (userId instanceof Response) return userId;

    const row = customers.get(String(params.id));
    if (!row || row.userId !== userId) {
      return HttpResponse.json({ error: "Not found" }, { status: 404 });
    }

    return HttpResponse.json({ customer: row });
  }),

  http.patch(`${CUSTOMERS_API_BASE}/api/customers/:id`, async ({ request, params }) => {
    const userId = requireUser(request);
    if (userId instanceof Response) return userId;

    const existing = customers.get(String(params.id));
    if (!existing || existing.userId !== userId) {
      return HttpResponse.json({ error: "Not found" }, { status: 404 });
    }

    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return HttpResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    if (body.name !== undefined) {
      if (typeof body.name !== "string" || !body.name.trim()) {
        return HttpResponse.json({ error: "Validation failed" }, { status: 400 });
      }
      existing.name = body.name.trim();
    }
    if (body.email !== undefined) {
      existing.email =
        typeof body.email === "string" && body.email.trim()
          ? body.email.trim()
          : null;
    }
    if (body.phone !== undefined) {
      existing.phone =
        typeof body.phone === "string" && body.phone.trim()
          ? body.phone.trim()
          : null;
    }
    if (body.address !== undefined) {
      existing.address =
        typeof body.address === "string" && body.address.trim()
          ? body.address.trim()
          : null;
    }
    if (body.gstNumber !== undefined) {
      existing.gstNumber =
        typeof body.gstNumber === "string" && body.gstNumber.trim()
          ? body.gstNumber.trim().toUpperCase()
          : null;
    }
    if (body.stateCode !== undefined || body.gstNumber !== undefined) {
      existing.stateCode =
        (typeof body.stateCode === "string" && body.stateCode.trim()) ||
        existing.gstNumber?.slice(0, 2) ||
        existing.stateCode;
    }

    customers.set(existing.id, existing);
    return HttpResponse.json({ customer: existing });
  }),
];
