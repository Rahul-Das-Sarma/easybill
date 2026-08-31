import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  updateUser: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getSession: authMocks.getSession,
      updateUser: authMocks.updateUser,
    },
  }),
}));

import { ResetPasswordForm } from "@/components/reset-password-form";

import { mockPush, mockRefresh } from "../../mocks/next-navigation";
import { getSubmitButton } from "../../helpers/submit-button";
import { renderWithProviders } from "../../helpers/render";

describe("ResetPasswordForm", () => {
  const envBackup = { ...process.env };

  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
    authMocks.getSession.mockReset();
    authMocks.updateUser.mockReset();
    authMocks.getSession.mockResolvedValue({
      data: { session: { access_token: "token" } },
    });
    authMocks.updateUser.mockResolvedValue({ error: null });
  });

  afterEach(() => {
    process.env = { ...envBackup };
  });

  it("shows missing env message when Supabase is not configured", () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;

    const { getByText } = renderWithProviders(<ResetPasswordForm />);
    expect(getByText(/Missing Supabase env vars/i)).toBeTruthy();
  });

  it("shows expired link message when there is no session", async () => {
    authMocks.getSession.mockResolvedValue({ data: { session: null } });

    const { findByRole } = renderWithProviders(<ResetPasswordForm />);
    const alert = await findByRole("alert");
    expect(alert.textContent).toMatch(/invalid or has expired/i);
  });

  it("updates password and redirects on success", async () => {
    const { container, findByLabelText } = renderWithProviders(
      <ResetPasswordForm />,
    );
    const userEvent = (await import("@testing-library/user-event")).default;
    const u = userEvent.setup();

    await u.type(await findByLabelText("New password"), "newsecret");
    await u.type(await findByLabelText("Confirm password"), "newsecret");
    await u.click(getSubmitButton(container, "Update password"));

    expect(authMocks.updateUser).toHaveBeenCalledWith({
      password: "newsecret",
    });
    expect(mockPush).toHaveBeenCalledWith("/dashboard");
    expect(mockRefresh).toHaveBeenCalled();
  });

  it("shows error when passwords do not match", async () => {
    const { container, findByLabelText, findByRole } = renderWithProviders(
      <ResetPasswordForm />,
    );
    const userEvent = (await import("@testing-library/user-event")).default;
    const u = userEvent.setup();

    await u.type(await findByLabelText("New password"), "newsecret");
    await u.type(await findByLabelText("Confirm password"), "different");
    await u.click(getSubmitButton(container, "Update password"));

    const alert = await findByRole("alert");
    expect(alert.textContent).toBe("Passwords do not match.");
    expect(authMocks.updateUser).not.toHaveBeenCalled();
  });

  it("shows error from Supabase", async () => {
    authMocks.updateUser.mockResolvedValue({
      error: { message: "Password too weak" },
    });

    const { container, findByLabelText, findByRole } = renderWithProviders(
      <ResetPasswordForm />,
    );
    const userEvent = (await import("@testing-library/user-event")).default;
    const u = userEvent.setup();

    await u.type(await findByLabelText("New password"), "newsecret");
    await u.type(await findByLabelText("Confirm password"), "newsecret");
    await u.click(getSubmitButton(container, "Update password"));

    const alert = await findByRole("alert");
    expect(alert.textContent).toBe("Password too weak");
  });
});
