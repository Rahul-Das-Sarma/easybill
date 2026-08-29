import { Prisma } from "@/generated/prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createDefaultUserRow,
  createMockPrisma,
  createSupabaseUser,
} from "../../mocks/auth-store";

vi.mock("react", () => ({
  cache: <T extends (...args: unknown[]) => unknown>(fn: T) => fn,
}));

const mockPrisma = createMockPrisma();

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

const mockCreateClient = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => mockCreateClient(),
}));

function mockSession(user: ReturnType<typeof createSupabaseUser> | null) {
  mockCreateClient.mockResolvedValue({
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: user ? { user } : null },
      }),
    },
  });
}

describe("auth-user", () => {
  beforeEach(() => {
    mockPrisma.reset();
    mockCreateClient.mockReset();
  });

  describe("getSessionUser", () => {
    it("returns the session user when authenticated", async () => {
      const supabaseUser = createSupabaseUser({ id: "user-1" });
      mockSession(supabaseUser);

      const { getSessionUser } = await import("@/lib/auth-user");
      const result = await getSessionUser();

      expect(result).toEqual(supabaseUser);
    });

    it("returns null when there is no session", async () => {
      mockSession(null);

      const { getSessionUser } = await import("@/lib/auth-user");
      const result = await getSessionUser();

      expect(result).toBeNull();
    });
  });

  describe("ensureAppUser", () => {
    it("does nothing when the user row already exists", async () => {
      mockPrisma.seed(createDefaultUserRow({ id: "user-1" }));
      const supabaseUser = createSupabaseUser({ id: "user-1" });

      const { ensureAppUser } = await import("@/lib/auth-user");
      await ensureAppUser(supabaseUser);

      expect(mockPrisma.user.create).not.toHaveBeenCalled();
    });

    it("creates a user row from Supabase metadata when missing", async () => {
      const supabaseUser = createSupabaseUser({
        id: "user-2",
        email: "acme@example.com",
        user_metadata: {
          full_name: "Acme Owner",
          company_name: "Acme Traders",
          address: "Mumbai",
        },
      });

      const { ensureAppUser } = await import("@/lib/auth-user");
      await ensureAppUser(supabaseUser);

      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          id: "user-2",
          email: "acme@example.com",
          name: "Acme Owner",
          companyName: "Acme Traders",
          address: "Mumbai",
          invoicePrefix: "INV",
        }),
      });
    });

    it("falls back to name and email-derived defaults in metadata", async () => {
      const supabaseUser = createSupabaseUser({
        id: "user-3",
        email: "shop@example.com",
        user_metadata: { name: "Shop Owner" },
      });

      const { ensureAppUser } = await import("@/lib/auth-user");
      await ensureAppUser(supabaseUser);

      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: "Shop Owner",
          companyName: "My business",
          address: "—",
        }),
      });
    });

    it("uses id-based email when Supabase email is missing", async () => {
      const supabaseUser = createSupabaseUser({
        id: "user-4",
        email: undefined,
        user_metadata: {},
      });

      const { ensureAppUser } = await import("@/lib/auth-user");
      await ensureAppUser(supabaseUser);

      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: "user-4@users.invalid",
          name: "user-4",
        }),
      });
    });

    it("ignores duplicate create races (P2002)", async () => {
      const supabaseUser = createSupabaseUser({ id: "user-5" });
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);
      mockPrisma.user.create.mockRejectedValueOnce(
        new Prisma.PrismaClientKnownRequestError("Unique", {
          code: "P2002",
          clientVersion: "test",
        }),
      );

      const { ensureAppUser } = await import("@/lib/auth-user");
      await expect(ensureAppUser(supabaseUser)).resolves.toBeUndefined();
    });

    it("rethrows non-duplicate prisma errors", async () => {
      const supabaseUser = createSupabaseUser({ id: "user-6" });
      mockPrisma.user.create.mockRejectedValueOnce(new Error("db down"));

      const { ensureAppUser } = await import("@/lib/auth-user");
      await expect(ensureAppUser(supabaseUser)).rejects.toThrow("db down");
    });
  });

  describe("getUserSettingsProfile", () => {
    it("returns existing profile without creating", async () => {
      mockPrisma.seed(
        createDefaultUserRow({
          id: "user-7",
          companyName: "Existing Co",
          gstScheme: "composition",
        }),
      );
      const supabaseUser = createSupabaseUser({ id: "user-7" });

      const { getUserSettingsProfile } = await import("@/lib/auth-user");
      const profile = await getUserSettingsProfile(supabaseUser);

      expect(profile).toMatchObject({
        companyName: "Existing Co",
        gstScheme: "composition",
      });
      expect(mockPrisma.user.create).not.toHaveBeenCalled();
    });

    it("creates then fetches profile when user row is missing", async () => {
      const supabaseUser = createSupabaseUser({
        id: "user-8",
        user_metadata: { company_name: "New Co" },
      });

      const { getUserSettingsProfile } = await import("@/lib/auth-user");
      const profile = await getUserSettingsProfile(supabaseUser);

      expect(mockPrisma.user.create).toHaveBeenCalled();
      expect(profile).toMatchObject({ companyName: "New Co" });
    });
  });

  describe("requireAppUser", () => {
    it("returns null when unauthenticated", async () => {
      mockSession(null);

      const { requireAppUser } = await import("@/lib/auth-user");
      const result = await requireAppUser();

      expect(result).toBeNull();
    });

    it("ensures app user and returns session user when authenticated", async () => {
      const supabaseUser = createSupabaseUser({ id: "user-9" });
      mockSession(supabaseUser);

      const { requireAppUser } = await import("@/lib/auth-user");
      const result = await requireAppUser();

      expect(result).toEqual(supabaseUser);
      expect(mockPrisma.user.create).toHaveBeenCalled();
    });
  });
});
