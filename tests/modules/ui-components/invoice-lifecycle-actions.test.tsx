import { describe, expect, it, vi } from "vitest";

import { InvoiceLifecycleActions } from "@/components/invoices/invoice-lifecycle-actions";

import { mockPush, mockRefresh } from "../../mocks/next-navigation";
import { renderWithProviders } from "../../helpers/render";
import {
  createMockInvoice,
  seedUiInvoice,
} from "../../mocks/handlers/ui-components";
import { server } from "../../mocks/server";
import { http, HttpResponse } from "msw";

const INVOICE_ID = "ui-inv-draft";

describe("InvoiceLifecycleActions", () => {
  it("renders nothing for non-draft invoices", () => {
    const { container } = renderWithProviders(
      <InvoiceLifecycleActions
        invoiceId={INVOICE_ID}
        status="pending"
        amountPaid="0"
      />,
    );

    expect(container.firstChild).toBeNull();
  });

  it("issues a draft invoice", async () => {
    seedUiInvoice(
      createMockInvoice({
        id: INVOICE_ID,
        invoiceNumber: "INV-UI-1",
        status: "draft",
      }),
    );

    const { getByRole } = renderWithProviders(
      <InvoiceLifecycleActions
        invoiceId={INVOICE_ID}
        status="draft"
        amountPaid="0"
      />,
    );

    const userEvent = (await import("@testing-library/user-event")).default;
    const u = userEvent.setup();
    await u.click(getByRole("button", { name: "Issue invoice" }));

    expect(mockRefresh).toHaveBeenCalled();
  });

  it("shows error when issue fails", async () => {
    const { getByRole, findByRole } = renderWithProviders(
      <InvoiceLifecycleActions
        invoiceId="missing-invoice"
        status="draft"
        amountPaid="0"
      />,
    );

    const userEvent = (await import("@testing-library/user-event")).default;
    const u = userEvent.setup();
    await u.click(getByRole("button", { name: "Issue invoice" }));

    const alert = await findByRole("alert");
    expect(alert.textContent).toMatch(/not found|issue/i);
  });

  it("deletes draft after confirmation", async () => {
    seedUiInvoice(
      createMockInvoice({
        id: INVOICE_ID,
        invoiceNumber: "INV-UI-DEL",
        status: "draft",
      }),
    );

    vi.spyOn(window, "confirm").mockReturnValue(true);

    const { getByRole } = renderWithProviders(
      <InvoiceLifecycleActions
        invoiceId={INVOICE_ID}
        status="draft"
        amountPaid="0"
      />,
    );

    const userEvent = (await import("@testing-library/user-event")).default;
    const u = userEvent.setup();
    await u.click(getByRole("button", { name: "Delete draft" }));

    expect(mockPush).toHaveBeenCalledWith("/invoices");
    expect(mockRefresh).toHaveBeenCalled();
  });

  it("skips delete when confirmation is cancelled", async () => {
    seedUiInvoice(
      createMockInvoice({
        id: INVOICE_ID,
        invoiceNumber: "INV-UI-KEEP",
        status: "draft",
      }),
    );

    vi.spyOn(window, "confirm").mockReturnValue(false);

    const { getByRole } = renderWithProviders(
      <InvoiceLifecycleActions
        invoiceId={INVOICE_ID}
        status="draft"
        amountPaid="0"
      />,
    );

    const userEvent = (await import("@testing-library/user-event")).default;
    const u = userEvent.setup();
    await u.click(getByRole("button", { name: "Delete draft" }));

    expect(mockPush).not.toHaveBeenCalled();
  });

  it("shows generic issue error when API omits message", async () => {
    server.use(
      http.post("*/api/invoices/:id/issue", () =>
        HttpResponse.json({}, { status: 500 }),
      ),
    );

    const { getByRole, findByRole } = renderWithProviders(
      <InvoiceLifecycleActions
        invoiceId={INVOICE_ID}
        status="draft"
        amountPaid="0"
      />,
    );

    const userEvent = (await import("@testing-library/user-event")).default;
    const u = userEvent.setup();
    await u.click(getByRole("button", { name: "Issue invoice" }));

    const alert = await findByRole("alert");
    expect(alert.textContent).toBe("Could not issue invoice.");
  });

  it("shows delete error when API fails", async () => {
    const { getByRole, findByRole } = renderWithProviders(
      <InvoiceLifecycleActions
        invoiceId="inv-delete-fail"
        status="draft"
        amountPaid="0"
      />,
    );

    vi.spyOn(window, "confirm").mockReturnValue(true);

    const userEvent = (await import("@testing-library/user-event")).default;
    const u = userEvent.setup();
    await u.click(getByRole("button", { name: "Delete draft" }));

    const alert = await findByRole("alert");
    expect(alert.textContent).toMatch(/delete|not found/i);
  });

  it("shows generic delete error when API omits message", async () => {
    seedUiInvoice(
      createMockInvoice({
        id: INVOICE_ID,
        invoiceNumber: "INV-ERR",
        status: "draft",
      }),
    );

    server.use(
      http.delete("*/api/invoices/:id", () =>
        HttpResponse.json({}, { status: 500 }),
      ),
    );

    vi.spyOn(window, "confirm").mockReturnValue(true);

    const { getByRole, findByRole } = renderWithProviders(
      <InvoiceLifecycleActions
        invoiceId={INVOICE_ID}
        status="draft"
        amountPaid="0"
      />,
    );

    const userEvent = (await import("@testing-library/user-event")).default;
    const u = userEvent.setup();
    await u.click(getByRole("button", { name: "Delete draft" }));

    const alert = await findByRole("alert");
    expect(alert.textContent).toBe("Could not delete invoice.");
  });

  it("disables actions when invoice has payments", () => {
    const { getByRole } = renderWithProviders(
      <InvoiceLifecycleActions
        invoiceId={INVOICE_ID}
        status="draft"
        amountPaid="10"
      />,
    );

    expect(getByRole("button", { name: "Issue invoice" })).toBeDisabled();
    expect(getByRole("button", { name: "Delete draft" })).toBeDisabled();
  });
});
