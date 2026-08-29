import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it } from "vitest";

import { CustomerEditCard } from "@/components/customers/customer-edit-card";

import { createDefaultCustomer } from "../../mocks/invoice-store";
import { mockRefresh } from "../../mocks/next-navigation";
import {
  resetUiComponentsStore,
  seedUiCustomer,
} from "../../mocks/handlers/ui-components";
import { server } from "../../mocks/server";
import { renderWithProviders } from "../../helpers/render";

const CUSTOMER = createDefaultCustomer({
  id: "cust-edit-1",
  name: "Acme Traders",
  email: "acme@example.com",
  phone: "9999999999",
  address: "Pune",
  gstNumber: "27AABCU9603R1ZM",
  stateCode: "27",
});

describe("CustomerEditCard", () => {
  beforeEach(() => {
    resetUiComponentsStore();
    seedUiCustomer(CUSTOMER);
  });

  it("renders placeholders for missing optional fields", () => {
    const { getAllByText } = renderWithProviders(
      <CustomerEditCard
        customer={{
          ...CUSTOMER,
          email: null,
          phone: null,
          address: null,
          gstNumber: null,
          stateCode: null,
        }}
      />,
    );

    expect(getAllByText("—").length).toBeGreaterThanOrEqual(4);
  });

  it("saves cleared optional fields as null", async () => {
    const { getByRole, getByLabelText } = renderWithProviders(
      <CustomerEditCard customer={CUSTOMER} />,
    );

    const userEvent = (await import("@testing-library/user-event")).default;
    const u = userEvent.setup();

    await u.click(getByRole("button", { name: "Edit" }));
    await u.clear(getByLabelText("Email"));
    await u.clear(getByLabelText("Phone"));
    await u.clear(getByLabelText("Address"));
    await u.click(getByRole("button", { name: "Save" }));

    expect(mockRefresh).toHaveBeenCalled();
  });

  it("shows generic save error when API omits message", async () => {
    server.use(
      http.patch("*/api/customers/:id", () =>
        HttpResponse.json({}, { status: 500 }),
      ),
    );

    const { getByRole, findByRole } = renderWithProviders(
      <CustomerEditCard customer={CUSTOMER} />,
    );

    const userEvent = (await import("@testing-library/user-event")).default;
    const u = userEvent.setup();

    await u.click(getByRole("button", { name: "Edit" }));
    await u.click(getByRole("button", { name: "Save" }));

    const alert = await findByRole("alert");
    expect(alert.textContent).toBe("Could not save customer.");
  });

  it("resets sparse optional fields on cancel", async () => {
    const sparse = {
      ...CUSTOMER,
      email: null,
      phone: null,
      address: null,
      gstNumber: null,
      stateCode: null,
    };

    const { getByRole, getByLabelText } = renderWithProviders(
      <CustomerEditCard customer={sparse} />,
    );

    const userEvent = (await import("@testing-library/user-event")).default;
    const u = userEvent.setup();

    await u.click(getByRole("button", { name: "Edit" }));
    await u.type(getByLabelText("Email"), "temp@example.com");
    await u.click(getByRole("button", { name: "Cancel" }));

    expect(getByRole("button", { name: "Edit" })).toBeTruthy();
  });

  it("renders customer details in view mode", () => {
    const { getByText, getByRole } = renderWithProviders(
      <CustomerEditCard customer={CUSTOMER} />,
    );

    expect(getByText("Acme Traders")).toBeTruthy();
    expect(getByText("acme@example.com")).toBeTruthy();
    expect(getByRole("button", { name: "Edit" })).toBeTruthy();
  });

  it("enters edit mode and saves changes", async () => {
    const { getByRole, getByLabelText } = renderWithProviders(
      <CustomerEditCard customer={CUSTOMER} />,
    );

    const userEvent = (await import("@testing-library/user-event")).default;
    const u = userEvent.setup();

    await u.click(getByRole("button", { name: "Edit" }));
    const nameInput = getByLabelText("Name");
    await u.clear(nameInput);
    await u.type(nameInput, "Acme Updated");
    await u.click(getByRole("button", { name: "Save" }));

    expect(mockRefresh).toHaveBeenCalled();
    expect(getByRole("button", { name: "Edit" })).toBeTruthy();
  });

  it("auto-fills state from GSTIN while editing", async () => {
    const { getByRole, getByLabelText } = renderWithProviders(
      <CustomerEditCard
        customer={{ ...CUSTOMER, gstNumber: null, stateCode: null }}
      />,
    );

    const userEvent = (await import("@testing-library/user-event")).default;
    const u = userEvent.setup();

    await u.click(getByRole("button", { name: "Edit" }));
    await u.type(getByLabelText("GSTIN"), "09AABCU9603R1ZM");

    expect((getByLabelText("State") as HTMLSelectElement).value).toBe("09");
  });

  it("shows error when save fails", async () => {
    const { getByRole, getByLabelText, findByRole } = renderWithProviders(
      <CustomerEditCard customer={{ ...CUSTOMER, id: "missing-customer" }} />,
    );

    const userEvent = (await import("@testing-library/user-event")).default;
    const u = userEvent.setup();

    await u.click(getByRole("button", { name: "Edit" }));
    await u.clear(getByLabelText("Name"));
    await u.type(getByLabelText("Name"), "Updated Name");
    await u.click(getByRole("button", { name: "Save" }));

    const alert = await findByRole("alert");
    expect(alert.textContent).toMatch(/not found|save/i);
  });

  it("updates contact fields while editing", async () => {
    const { getByRole, getByLabelText } = renderWithProviders(
      <CustomerEditCard customer={CUSTOMER} />,
    );

    const userEvent = (await import("@testing-library/user-event")).default;
    const u = userEvent.setup();

    await u.click(getByRole("button", { name: "Edit" }));
    await u.clear(getByLabelText("Email"));
    await u.type(getByLabelText("Email"), "new@acme.com");
    await u.clear(getByLabelText("Phone"));
    await u.type(getByLabelText("Phone"), "8888888888");
    await u.clear(getByLabelText("Address"));
    await u.type(getByLabelText("Address"), "Mumbai");
    await u.selectOptions(getByLabelText("State"), "09");

    expect((getByLabelText("Email") as HTMLInputElement).value).toBe(
      "new@acme.com",
    );
    expect((getByLabelText("State") as HTMLSelectElement).value).toBe("09");
  });

  it("cancels editing and restores original values", async () => {
    const { getByRole, getByLabelText, queryByRole } = renderWithProviders(
      <CustomerEditCard customer={CUSTOMER} />,
    );

    const userEvent = (await import("@testing-library/user-event")).default;
    const u = userEvent.setup();

    await u.click(getByRole("button", { name: "Edit" }));
    await u.clear(getByLabelText("Name"));
    await u.type(getByLabelText("Name"), "Temporary Name");
    await u.click(getByRole("button", { name: "Cancel" }));

    expect(getByRole("button", { name: "Edit" })).toBeTruthy();
    expect(queryByRole("button", { name: "Save" })).toBeNull();
    expect(getByRole("heading", { level: 2, name: "Details" })).toBeTruthy();
  });
});
