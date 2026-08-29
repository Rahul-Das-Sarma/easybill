import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it } from "vitest";

import { server } from "../../mocks/server";
import {
  createMockInvoice,
  resetUiComponentsStore,
  seedUiCustomer,
  seedUiInvoice,
} from "../../mocks/handlers/ui-components";
import { createDefaultCustomer } from "../../mocks/invoice-store";

describe("UI components — MSW mock server integration", () => {
  beforeEach(() => {
    resetUiComponentsStore();
  });

  it("creates customer via relative /api/customers path", async () => {
    const res = await fetch("/api/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "MSW Buyer", email: "msw@example.com" }),
    });

    expect(res.status).toBe(200);
    const data = (await res.json()) as { customer: { name: string } };
    expect(data.customer.name).toBe("MSW Buyer");
  });

  it("patches customer via relative path", async () => {
    seedUiCustomer(
      createDefaultCustomer({ id: "msw-cust", name: "Before", userId: "ui-user" }),
    );

    const res = await fetch("/api/customers/msw-cust", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "After" }),
    });

    expect(res.status).toBe(200);
    const data = (await res.json()) as { customer: { name: string } };
    expect(data.customer.name).toBe("After");
  });

  it("issues invoice via relative path", async () => {
    seedUiInvoice(
      createMockInvoice({
        id: "msw-inv",
        invoiceNumber: "INV-MSW",
        status: "draft",
      }),
    );

    const res = await fetch("/api/invoices/msw-inv/issue", { method: "POST" });
    expect(res.status).toBe(200);
    const data = (await res.json()) as { invoice: { status: string } };
    expect(data.invoice.status).toBe("pending");
  });

  it("allows runtime handler overrides via server.use", async () => {
    server.use(
      http.post("*/api/invoices/:id/issue", () =>
        HttpResponse.json({ invoice: { id: "x", status: "issued-via-override" } }),
      ),
    );

    const res = await fetch("/api/invoices/any/issue", { method: "POST" });
    const data = (await res.json()) as { invoice: { status: string } };
    expect(data.invoice.status).toBe("issued-via-override");
  });
});
