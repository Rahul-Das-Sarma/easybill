import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  resetPasswordForEmail: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      resetPasswordForEmail: authMocks.resetPasswordForEmail,
    },
  }),
}));

import { ForgotPasswordForm } from "@/components/forgot-password-form";

import { getSubmitButton } from "../../helpers/submit-button";
import { renderWithProviders } from "../../helpers/render";

describe("ForgotPasswordForm", () => {
  const envBackup = { ...process.env };

  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
    authMocks.resetPasswordForEmail.mockReset();
    authMocks.resetPasswordForEmail.mockResolvedValue({ error: null });
  });

  afterEach(() => {
    process.env = { ...envBackup };
  });

  it("shows missing env message when Supabase is not configured", () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;

    const { getByText } = renderWithProviders(<ForgotPasswordForm />);
    expect(getByText(/Missing Supabase env vars/i)).toBeTruthy();
  });

  it("sends reset email and shows success message", async () => {
    const { container, getByLabelText, findByRole } = renderWithProviders(
      <ForgotPasswordForm />,
    );
    const userEvent = (await import("@testing-library/user-event")).default;
    const u = userEvent.setup();

    await u.type(getByLabelText("Email"), "user@example.com");
    await u.click(getSubmitButton(container, "Send reset link"));

    expect(authMocks.resetPasswordForEmail).toHaveBeenCalledWith(
      "user@example.com",
      {
        redirectTo: expect.stringContaining(
          "/auth/callback?next=/login/reset-password",
        ),
      },
    );
    const status = await findByRole("status");
    expect(status.textContent).toMatch(/if an account exists/i);
  });

  it("shows error from Supabase", async () => {
    authMocks.resetPasswordForEmail.mockResolvedValue({
      error: { message: "Rate limit exceeded" },
    });

    const { container, getByLabelText, findByRole } = renderWithProviders(
      <ForgotPasswordForm />,
    );
    const userEvent = (await import("@testing-library/user-event")).default;
    const u = userEvent.setup();

    await u.type(getByLabelText("Email"), "user@example.com");
    await u.click(getSubmitButton(container, "Send reset link"));

    const alert = await findByRole("alert");
    expect(alert.textContent).toBe("Rate limit exceeded");
  });
});
