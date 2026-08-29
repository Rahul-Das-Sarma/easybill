import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      signInWithPassword: authMocks.signInWithPassword,
      signUp: authMocks.signUp,
    },
  }),
}));

import { LoginForm } from "@/components/login-form";

import { mockPush, mockRefresh, mockSearchParams } from "../../mocks/next-navigation";
import { getSubmitButton } from "../../helpers/submit-button";
import { renderWithProviders } from "../../helpers/render";

describe("LoginForm", () => {
  const envBackup = { ...process.env };

  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
    authMocks.signInWithPassword.mockReset();
    authMocks.signUp.mockReset();
    authMocks.signInWithPassword.mockResolvedValue({ error: null });
    authMocks.signUp.mockResolvedValue({
      data: { session: { access_token: "token" } },
      error: null,
    });
  });

  afterEach(() => {
    process.env = { ...envBackup };
  });

  it("shows missing env message when Supabase is not configured", () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;

    const { getByText } = renderWithProviders(<LoginForm />);
    expect(getByText(/Missing Supabase env vars/i)).toBeTruthy();
  });

  it("signs in and redirects on success", async () => {
    mockSearchParams.set("next", "/invoices");

    const { container, getByLabelText } = renderWithProviders(<LoginForm />);
    const userEvent = (await import("@testing-library/user-event")).default;
    const u = userEvent.setup();

    await u.type(getByLabelText("Email"), "user@example.com");
    await u.type(getByLabelText("Password"), "secret12");
    await u.click(getSubmitButton(container, "Sign in"));

    expect(authMocks.signInWithPassword).toHaveBeenCalledWith({
      email: "user@example.com",
      password: "secret12",
    });
    expect(mockPush).toHaveBeenCalledWith("/invoices");
    expect(mockRefresh).toHaveBeenCalled();
  });

  it("shows sign-in error from Supabase", async () => {
    authMocks.signInWithPassword.mockResolvedValue({
      error: { message: "Invalid credentials" },
    });

    const { container, getByLabelText, findByRole } = renderWithProviders(
      <LoginForm />,
    );
    const userEvent = (await import("@testing-library/user-event")).default;
    const u = userEvent.setup();

    await u.type(getByLabelText("Email"), "user@example.com");
    await u.type(getByLabelText("Password"), "wrong");
    await u.click(getSubmitButton(container, "Sign in"));

    const alert = await findByRole("alert");
    expect(alert.textContent).toBe("Invalid credentials");
  });

  it("switches to sign up and creates account", async () => {
    const { container, getByRole, getByLabelText } = renderWithProviders(
      <LoginForm />,
    );
    const userEvent = (await import("@testing-library/user-event")).default;
    const u = userEvent.setup();

    await u.click(getByRole("button", { name: "Sign up" }));
    await u.type(getByLabelText(/Company name/i), "Acme Pvt Ltd");
    await u.type(getByLabelText("Email"), "new@example.com");
    await u.type(getByLabelText("Password"), "secret12");
    await u.click(getSubmitButton(container, "Create account"));

    expect(authMocks.signUp).toHaveBeenCalledWith({
      email: "new@example.com",
      password: "secret12",
      options: {
        emailRedirectTo: expect.stringContaining("/auth/callback"),
        data: { company_name: "Acme Pvt Ltd" },
      },
    });
    expect(mockPush).toHaveBeenCalled();
  });

  it("shows confirmation info when sign up returns no session", async () => {
    authMocks.signUp.mockResolvedValue({
      data: { session: null },
      error: null,
    });

    const { container, getAllByRole, getByLabelText, findByRole } =
      renderWithProviders(<LoginForm />);
    const userEvent = (await import("@testing-library/user-event")).default;
    const u = userEvent.setup();

    await u.click(getAllByRole("button", { name: "Sign up" })[0]!);
    await u.type(getByLabelText("Email"), "new@example.com");
    await u.type(getByLabelText("Password"), "secret12");
    await u.click(getSubmitButton(container, "Create account"));

    const status = await findByRole("status");
    expect(status.textContent).toMatch(/check your email/i);
    expect(getAllByRole("button", { name: "Sign in" })[0]).toHaveClass(
      "bg-brand-50",
    );
  });

  it("redirects to dashboard when next param is external", async () => {
    mockSearchParams.set("next", "https://evil.example/phish");

    const { container, getByLabelText } = renderWithProviders(<LoginForm />);
    const userEvent = (await import("@testing-library/user-event")).default;
    const u = userEvent.setup();

    await u.type(getByLabelText("Email"), "user@example.com");
    await u.type(getByLabelText("Password"), "secret12");
    await u.click(getSubmitButton(container, "Sign in"));

    expect(mockPush).toHaveBeenCalledWith("/dashboard");
  });

  it("accepts publishable default key env var", () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY = "publishable-key";

    const { getByLabelText } = renderWithProviders(<LoginForm />);
    expect(getByLabelText("Email")).toBeTruthy();
  });

  it("shows sign-up error from Supabase", async () => {
    authMocks.signUp.mockResolvedValue({
      data: { session: null },
      error: { message: "Email taken" },
    });

    const { container, getAllByRole, getByLabelText, findByRole } =
      renderWithProviders(<LoginForm />);
    const userEvent = (await import("@testing-library/user-event")).default;
    const u = userEvent.setup();

    await u.click(getAllByRole("button", { name: "Sign up" })[0]!);
    await u.type(getByLabelText("Email"), "taken@example.com");
    await u.type(getByLabelText("Password"), "secret12");
    await u.click(getSubmitButton(container, "Create account"));

    const alert = await findByRole("alert");
    expect(alert.textContent).toBe("Email taken");
  });

  it("clears errors when switching back to sign in", async () => {
    const { getAllByRole, getByLabelText, queryByLabelText } =
      renderWithProviders(<LoginForm />);
    const userEvent = (await import("@testing-library/user-event")).default;
    const u = userEvent.setup();

    await u.click(getAllByRole("button", { name: "Sign up" })[0]!);
    expect(getByLabelText(/Company name/i)).toBeTruthy();
    await u.click(getAllByRole("button", { name: "Sign in" })[0]!);
    expect(queryByLabelText(/Company name/i)).toBeNull();
  });

  it("clears errors when switching auth mode", async () => {
    mockSearchParams.set("error", "Previous error");

    const { getAllByRole, getByRole, queryByRole } = renderWithProviders(
      <LoginForm />,
    );
    const userEvent = (await import("@testing-library/user-event")).default;
    const u = userEvent.setup();

    expect(getByRole("alert").textContent).toBe("Previous error");
    await u.click(getAllByRole("button", { name: "Sign up" })[0]!);
    expect(queryByRole("alert")).toBeNull();
  });

  it("signs up without optional company name metadata", async () => {
    const { container, getAllByRole, getByLabelText } = renderWithProviders(
      <LoginForm />,
    );
    const userEvent = (await import("@testing-library/user-event")).default;
    const u = userEvent.setup();

    await u.click(getAllByRole("button", { name: "Sign up" })[0]!);
    await u.type(getByLabelText("Email"), "bare@example.com");
    await u.type(getByLabelText("Password"), "secret12");
    await u.click(getSubmitButton(container, "Create account"));

    expect(authMocks.signUp).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({ data: undefined }),
      }),
    );
  });

  it("toggles password visibility", async () => {
    const { getByLabelText, getByRole } = renderWithProviders(<LoginForm />);
    const userEvent = (await import("@testing-library/user-event")).default;
    const u = userEvent.setup();

    const password = getByLabelText("Password") as HTMLInputElement;
    expect(password.type).toBe("password");

    await u.click(getByRole("button", { name: "Show password" }));
    expect(password.type).toBe("text");

    await u.click(getByRole("button", { name: "Hide password" }));
    expect(password.type).toBe("password");
  });

  it("displays URL error from search params", () => {
    mockSearchParams.set("error", "OAuth failed");

    const { getByRole } = renderWithProviders(<LoginForm />);
    expect(getByRole("alert").textContent).toBe("OAuth failed");
  });

  it("shows forgot password link in sign-in mode", () => {
    const { getByRole } = renderWithProviders(<LoginForm />);
    expect(getByRole("link", { name: "Forgot password?" })).toHaveAttribute(
      "href",
      "/login/forgot-password",
    );
  });
});
