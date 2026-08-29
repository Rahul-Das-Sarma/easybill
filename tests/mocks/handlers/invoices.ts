import { http, HttpResponse } from "msw";

import {
  createDefaultCustomer,
  createMockInvoice,
  CUSTOMER_ID,
  USER_ID,
  validCreateBody,
} from "../invoice-store";

export const INVOICES_API_BASE = "http://test.local";

type StoredInvoice = ReturnType<typeof createMockInvoice> & {
  lines: Array<{
    productName: string;
    quantity: number;
    unitPrice: number;
    taxRate: number;
  }>;
};

const invoices = new Map<string, StoredInvoice>();
const customers = new Map<string, ReturnType<typeof createDefaultCustomer>>();
let nextInvoiceId = 1;

function requireUser(request: Request): string | Response {
  const auth = request.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) {
    return HttpResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return auth.slice("Bearer ".length);
}

export function resetInvoicesStore() {
  invoices.clear();
  customers.clear();
  nextInvoiceId = 1;
}

export function seedInvoiceCustomer() {
  customers.set(CUSTOMER_ID, createDefaultCustomer());
}

export function seedMswInvoice(
  row: ReturnType<typeof createMockInvoice>,
  lines = validCreateBody().lines,
) {
  invoices.set(row.id, { ...row, lines });
}

export const invoicesHandlers = [
  http.get(`${INVOICES_API_BASE}/api/invoices`, ({ request }) => {
    const userId = requireUser(request);
    if (userId instanceof Response) return userId;

    const url = new URL(request.url);
    const tab = url.searchParams.get("tab") ?? "all";
    const today = new Date("2026-08-29T00:00:00.000Z");

    let rows = [...invoices.values()].filter((inv) => inv.userId === userId);
    if (tab === "paid") {
      rows = rows.filter((inv) => inv.status === "paid");
    } else if (tab === "pending") {
      rows = rows.filter(
        (inv) => inv.status !== "paid" && inv.dueDate >= today,
      );
    } else if (tab === "overdue") {
      rows = rows.filter(
        (inv) => inv.status !== "paid" && inv.dueDate < today,
      );
    }

    return HttpResponse.json({
      items: rows.map((inv) => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        status: inv.status,
        totalAmount: inv.totalAmount.toString(),
        amountPaid: inv.amountPaid.toString(),
        dueDate: inv.dueDate.toISOString().slice(0, 10),
        customer: { id: inv.customerId, name: customers.get(inv.customerId)?.name ?? "Customer" },
      })),
      total: rows.length,
      page: 1,
      limit: 20,
      totalPages: 1,
    });
  }),

  http.post(`${INVOICES_API_BASE}/api/invoices`, async ({ request }) => {
    const userId = requireUser(request);
    if (userId instanceof Response) return userId;

    let body: ReturnType<typeof validCreateBody>;
    try {
      body = (await request.json()) as ReturnType<typeof validCreateBody>;
    } catch {
      return HttpResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    if (!body.customerId || !customers.has(body.customerId)) {
      return HttpResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const id = `msw-invoice-${nextInvoiceId++}`;
    const row = createMockInvoice({
      id,
      invoiceNumber: `INV-2026-${String(nextInvoiceId).padStart(3, "0")}`,
      status: "draft",
    });
    invoices.set(id, { ...row, lines: body.lines });

    return HttpResponse.json({
      invoice: {
        id,
        invoiceNumber: row.invoiceNumber,
        totalAmount: row.totalAmount.toString(),
      },
    });
  }),

  http.get(`${INVOICES_API_BASE}/api/invoices/:id`, ({ request, params }) => {
    const userId = requireUser(request);
    if (userId instanceof Response) return userId;

    const inv = invoices.get(String(params.id));
    if (!inv || inv.userId !== userId) {
      return HttpResponse.json({ error: "Not found" }, { status: 404 });
    }

    const customer = customers.get(inv.customerId);
    return HttpResponse.json({
      invoice: {
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        status: inv.status,
        customerId: inv.customerId,
        issueDate: inv.issueDate.toISOString().slice(0, 10),
        dueDate: inv.dueDate.toISOString().slice(0, 10),
        discountAmount: inv.discountAmount.toString(),
        amountPaid: inv.amountPaid.toString(),
        customer,
        lines: inv.lines,
      },
    });
  }),

  http.patch(`${INVOICES_API_BASE}/api/invoices/:id`, async ({ request, params }) => {
    const userId = requireUser(request);
    if (userId instanceof Response) return userId;

    const inv = invoices.get(String(params.id));
    if (!inv || inv.userId !== userId) {
      return HttpResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (inv.status !== "draft") {
      return HttpResponse.json(
        { error: "Only draft invoices can be edited" },
        { status: 400 },
      );
    }

    const body = (await request.json()) as { lines?: StoredInvoice["lines"] };
    if (body.lines) inv.lines = body.lines;
    invoices.set(inv.id, inv);

    return HttpResponse.json({
      invoice: { id: inv.id, invoiceNumber: inv.invoiceNumber },
    });
  }),

  http.delete(`${INVOICES_API_BASE}/api/invoices/:id`, ({ request, params }) => {
    const userId = requireUser(request);
    if (userId instanceof Response) return userId;

    const inv = invoices.get(String(params.id));
    if (!inv || inv.userId !== userId) {
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

  http.post(`${INVOICES_API_BASE}/api/invoices/:id/issue`, ({ request, params }) => {
    const userId = requireUser(request);
    if (userId instanceof Response) return userId;

    const inv = invoices.get(String(params.id));
    if (!inv || inv.userId !== userId) {
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
];

// Seed default customer for MSW create flow
customers.set(CUSTOMER_ID, createDefaultCustomer({ userId: USER_ID }));
