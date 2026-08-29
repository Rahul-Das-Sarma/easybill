import { describe, expect, it } from "vitest";

import { PageHeader } from "@/components/page-header";

import { renderWithProviders } from "../../helpers/render";

describe("PageHeader", () => {
  it("renders title and description", () => {
    const { getByRole, getByText } = renderWithProviders(
      <PageHeader title="Invoices" description="Manage your invoices" />,
    );

    expect(getByRole("heading", { name: "Invoices" })).toBeTruthy();
    expect(getByText("Manage your invoices")).toBeTruthy();
  });

  it("renders without optional description", () => {
    const { getByRole, queryByText } = renderWithProviders(
      <PageHeader title="Customers" />,
    );

    expect(getByRole("heading", { name: "Customers" })).toBeTruthy();
    expect(queryByText("Manage your invoices")).toBeNull();
  });

  it("renders action slot when provided", () => {
    const { getByRole } = renderWithProviders(
      <PageHeader
        title="Invoices"
        actions={<button type="button">Create</button>}
      />,
    );

    expect(getByRole("button", { name: "Create" })).toBeTruthy();
  });

  it("applies custom className", () => {
    const { container } = renderWithProviders(
      <PageHeader title="Settings" className="custom-header" />,
    );

    expect((container.firstChild as HTMLElement).className).toContain(
      "custom-header",
    );
  });
});
