import { http, HttpResponse } from "msw";

import { createDefaultCustomer, createMockInvoice } from "../invoice-store";

export { createMockInvoice };

const customers = new Map<string, ReturnType<typeof createDefaultCustomer>>();
const invoices = new Map<string, ReturnType<typeof createMockInvoice>>();
let nextCustomerId = 1;

export function resetUiComponentsStore() {
  customers.clear();
  invoices.clear();
  nextCustomerId = 1;
}

export function seedUiCustomer(
  row: ReturnType<typeof createDefaultCustomer>,
) {
  customers.set(row.id, { ...row });
}

export function seedUiInvoice(row: ReturnType<typeof createMockInvoice>) {
  invoices.set(row.id, row);
}

/** Relative-path handlers for client components using fetch('/api/...'). */
export const uiComponentsHandlers = [
  http.post("*/api/customers", async ({ request }) => {
    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return HttpResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) {
      return HttpResponse.json({ error: "Name required" }, { status: 400 });
    }

    const id = `ui-customer-${nextCustomerId++}`;
    const row = createDefaultCustomer({
      id,
      userId: "ui-user",
      name,
      email:
        typeof body.email === "string" && body.email.trim()
          ? body.email.trim()
          : null,
      phone:
        typeof body.phone === "string" && body.phone.trim()
          ? body.phone.trim()
          : null,
      address:
        typeof body.address === "string" && body.address.trim()
          ? body.address.trim()
          : null,
      gstNumber:
        typeof body.gstNumber === "string" && body.gstNumber.trim()
          ? body.gstNumber.trim().toUpperCase()
          : null,
      stateCode:
        typeof body.stateCode === "string" && body.stateCode.trim()
          ? body.stateCode.trim()
          : null,
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

  http.patch("*/api/customers/:id", async ({ params, request }) => {
    const existing = customers.get(String(params.id));
    if (!existing) {
      return HttpResponse.json({ error: "Not found" }, { status: 404 });
    }

    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return HttpResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    if (typeof body.name === "string" && body.name.trim()) {
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
    if (body.stateCode !== undefined) {
      existing.stateCode =
        typeof body.stateCode === "string" && body.stateCode.trim()
          ? body.stateCode.trim()
          : null;
    }

    customers.set(existing.id, existing);
    return HttpResponse.json({ customer: existing });
  }),

  http.post("*/api/invoices/:id/issue", ({ params }) => {
    const inv = invoices.get(String(params.id));
    if (!inv) {
      return HttpResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (inv.status !== "draft") {
      return HttpResponse.json(
        { error: "Only draft invoices can be issued" },
        { status: 400 },
      );
    }

    inv.status = "pending";
    invoices.set(inv.id, inv);
    return HttpResponse.json({ invoice: { id: inv.id, status: "pending" } });
  }),

  http.delete("*/api/invoices/:id", ({ params }) => {
    const inv = invoices.get(String(params.id));
    if (!inv) {
      return HttpResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (inv.status !== "draft") {
      return HttpResponse.json(
        { error: "Only draft invoices can be deleted" },
        { status: 400 },
      );
    }

    invoices.delete(inv.id);
    return HttpResponse.json({ ok: true });
  }),
];
