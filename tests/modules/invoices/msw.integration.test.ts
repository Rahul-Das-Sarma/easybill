import { beforeEach, describe, expect, it } from "vitest";

import {
  CUSTOMER_ID,
  createMockInvoice,
  USER_ID,
  validCreateBody,
} from "../../mocks/invoice-store";
import {
  INVOICES_API_BASE,
  resetInvoicesStore,
  seedInvoiceCustomer,
  seedMswInvoice,
} from "../../mocks/handlers/invoices";

const AUTH = { Authorization: `Bearer ${USER_ID}` };

describe("Invoices API — MSW mock server integration", () => {
  beforeEach(() => {
    resetInvoicesStore();
    seedInvoiceCustomer();
  });

  it("POST /api/invoices creates a draft", async () => {
    const res = await fetch(`${INVOICES_API_BASE}/api/invoices`, {
      method: "POST",
      headers: { ...AUTH, "Content-Type": "application/json" },
      body: JSON.stringify(validCreateBody(CUSTOMER_ID)),
    });

    expect(res.status).toBe(200);
    const json = (await res.json()) as { invoice: { invoiceNumber: string } };
    expect(json.invoice.invoiceNumber).toMatch(/^INV-2026-/);
  });

  it("GET /api/invoices lists invoices", async () => {
    seedMswInvoice(
      createMockInvoice({ id: "msw-1", invoiceNumber: "INV-MSW-1", status: "draft" }),
    );

    const res = await fetch(`${INVOICES_API_BASE}/api/invoices`, { headers: AUTH });
    const json = (await res.json()) as { items: unknown[]; total: number };
    expect(res.status).toBe(200);
    expect(json.total).toBe(1);
  });

  it("GET /api/invoices/:id returns invoice detail", async () => {
    seedMswInvoice(
      createMockInvoice({ id: "msw-detail", invoiceNumber: "INV-DET" }),
    );

    const res = await fetch(`${INVOICES_API_BASE}/api/invoices/msw-detail`, {
      headers: AUTH,
    });
    const json = (await res.json()) as { invoice: { invoiceNumber: string } };
    expect(res.status).toBe(200);
    expect(json.invoice.invoiceNumber).toBe("INV-DET");
  });

  it("POST /api/invoices/:id/issue marks draft as pending", async () => {
    seedMswInvoice(
      createMockInvoice({
        id: "msw-issue",
        invoiceNumber: "INV-ISS",
        status: "draft",
      }),
    );

    const res = await fetch(`${INVOICES_API_BASE}/api/invoices/msw-issue/issue`, {
      method: "POST",
      headers: AUTH,
    });
    const json = (await res.json()) as { invoice: { status: string } };
    expect(res.status).toBe(200);
    expect(json.invoice.status).toBe("pending");
  });

  it("DELETE /api/invoices/:id removes draft", async () => {
    seedMswInvoice(
      createMockInvoice({
        id: "msw-del",
        invoiceNumber: "INV-DEL",
        status: "draft",
      }),
    );

    const res = await fetch(`${INVOICES_API_BASE}/api/invoices/msw-del`, {
      method: "DELETE",
      headers: AUTH,
    });
    expect(res.status).toBe(200);

    const check = await fetch(`${INVOICES_API_BASE}/api/invoices/msw-del`, {
      headers: AUTH,
    });
    expect(check.status).toBe(404);
  });

  it("returns 401 without auth", async () => {
    const res = await fetch(`${INVOICES_API_BASE}/api/invoices`);
    expect(res.status).toBe(401);
  });

  it("returns 403 when customer not found on create", async () => {
    const res = await fetch(`${INVOICES_API_BASE}/api/invoices`, {
      method: "POST",
      headers: { ...AUTH, "Content-Type": "application/json" },
      body: JSON.stringify({
        ...validCreateBody(),
        customerId: "44444444-4444-4444-8444-444444444444",
      }),
    });
    expect(res.status).toBe(403);
  });
});
