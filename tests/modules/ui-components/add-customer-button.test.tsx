import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";

const scrollMocks = vi.hoisted(() => ({
  lockDocumentScroll: vi.fn(),
  unlockDocumentScroll: vi.fn(),
}));

vi.mock("@/lib/scroll-lock", () => scrollMocks);

import { AddCustomerButton } from "@/components/customers/add-customer-button";

import { mockRefresh } from "../../mocks/next-navigation";
import { server } from "../../mocks/server";
import { renderWithProviders } from "../../helpers/render";

describe("AddCustomerButton", () => {
  it("opens dialog and creates a customer", async () => {
    const { getByRole, getByLabelText } = renderWithProviders(
      <AddCustomerButton />,
    );

    const userEvent = (await import("@testing-library/user-event")).default;
    const u = userEvent.setup();

    await u.click(getByRole("button", { name: "Add customer" }));
    await u.type(getByLabelText(/Name/i), "New Buyer");
    await u.type(getByLabelText(/Email/i), "buyer@example.com");
    await u.click(getByRole("button", { name: "Create customer" }));

    expect(mockRefresh).toHaveBeenCalled();
  });

  it("shows API error message on failure", async () => {
    server.use(
      http.post("*/api/customers", () =>
        HttpResponse.json({ error: "Duplicate customer" }, { status: 409 }),
      ),
    );

    const { getByRole, getByLabelText, findByRole } = renderWithProviders(
      <AddCustomerButton />,
    );

    const userEvent = (await import("@testing-library/user-event")).default;
    const u = userEvent.setup();

    await u.click(getByRole("button", { name: "Add customer" }));
    await u.type(getByLabelText(/Name/i), "Dup Buyer");
    await u.click(getByRole("button", { name: "Create customer" }));

    const alert = await findByRole("alert");
    expect(alert.textContent).toBe("Duplicate customer");
  });

  it("shows generic error when API returns structured error object", async () => {
    server.use(
      http.post("*/api/customers", () =>
        HttpResponse.json({ error: { name: ["Invalid"] } }, { status: 400 }),
      ),
    );

    const { getByRole, getByLabelText, findByRole } = renderWithProviders(
      <AddCustomerButton />,
    );

    const userEvent = (await import("@testing-library/user-event")).default;
    const u = userEvent.setup();

    await u.click(getByRole("button", { name: "Add customer" }));
    await u.type(getByLabelText(/Name/i), "Bad Data");
    await u.click(getByRole("button", { name: "Create customer" }));

    const alert = await findByRole("alert");
    expect(alert.textContent).toMatch(/could not create customer/i);
  });

  it("does not reopen dialog when already open", async () => {
    const { getByRole } = renderWithProviders(<AddCustomerButton />);

    const userEvent = (await import("@testing-library/user-event")).default;
    const u = userEvent.setup();

    await u.click(getByRole("button", { name: "Add customer" }));
    await u.click(getByRole("button", { name: "Add customer" }));

    expect(getByRole("heading", { name: "New customer" })).toBeTruthy();
  });

  it("unlocks scroll on unmount", async () => {
    const { getByRole, unmount } = renderWithProviders(<AddCustomerButton />);

    const userEvent = (await import("@testing-library/user-event")).default;
    const u = userEvent.setup();
    await u.click(getByRole("button", { name: "Add customer" }));

    unmount();
    expect(scrollMocks.unlockDocumentScroll).toHaveBeenCalled();
  });

  it("closes dialog on cancel", async () => {
    const { getByRole, queryByRole } = renderWithProviders(
      <AddCustomerButton />,
    );

    const userEvent = (await import("@testing-library/user-event")).default;
    const u = userEvent.setup();

    await u.click(getByRole("button", { name: "Add customer" }));
    expect(getByRole("heading", { name: "New customer" })).toBeTruthy();

    await u.click(getByRole("button", { name: "Cancel" }));
    expect(queryByRole("heading", { name: "New customer" })).toBeNull();
  });
});
