import { Prisma } from "@/generated/prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createDefaultUserRow, createMockPrisma } from "../../mocks/auth-store";

vi.mock("react", () => ({
  cache: <T extends (...args: unknown[]) => unknown>(fn: T) => fn,
}));

const mockPrisma = createMockPrisma();

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

const clerkMocks = vi.hoisted(() => ({
  auth: vi.fn(),
  currentUser: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: () => clerkMocks.auth(),
  currentUser: () => clerkMocks.currentUser(),
}));

const APP_ID = "11111111-1111-4111-8111-111111111111";

function clerkProfile(overrides?: {
  fullName?: string | null;
  primaryEmailAddressId?: string | null;
  emailAddresses?: { id: string; emailAddress: string }[];
}) {
  return {
    fullName:
      overrides && "fullName" in overrides ? overrides.fullName : "Acme Owner",
    primaryEmailAddressId:
      overrides && "primaryEmailAddressId" in overrides
        ? overrides.primaryEmailAddressId
        : "email-1",
    emailAddresses: overrides?.emailAddresses ?? [
      { id: "email-1", emailAddress: "acme@example.com" },
    ],
  };
}

describe("auth-user", () => {
  beforeEach(() => {
    mockPrisma.reset();
    clerkMocks.auth.mockReset();
    clerkMocks.currentUser.mockReset();
    vi.spyOn(crypto, "randomUUID").mockReturnValue(APP_ID);
  });

  describe("getSessionUser", () => {
    it("returns null when there is no Clerk session", async () => {
      clerkMocks.auth.mockResolvedValue({ userId: null });

      const { getSessionUser } = await import("@/lib/auth-user");
      await expect(getSessionUser()).resolves.toBeNull();
    });

    it("returns the linked app user without calling Clerk profile", async () => {
      mockPrisma.seed(
        createDefaultUserRow({
          id: "app-user-1",
          clerkUserId: "user_clerk_1",
          email: "linked@example.com",
        }),
      );
      clerkMocks.auth.mockResolvedValue({ userId: "user_clerk_1" });

      const { getSessionUser } = await import("@/lib/auth-user");
      await expect(getSessionUser()).resolves.toEqual({
        id: "app-user-1",
        email: "linked@example.com",
      });
      expect(clerkMocks.currentUser).not.toHaveBeenCalled();
    });

    it("returns null when Clerk has a session but no profile", async () => {
      clerkMocks.auth.mockResolvedValue({ userId: "user_clerk_2" });
      clerkMocks.currentUser.mockResolvedValue(null);

      const { getSessionUser } = await import("@/lib/auth-user");
      await expect(getSessionUser()).resolves.toBeNull();
    });

    it("links an existing business by email", async () => {
      mockPrisma.seed(
        createDefaultUserRow({
          id: "app-user-3",
          email: "acme@example.com",
          clerkUserId: null,
        }),
      );
      clerkMocks.auth.mockResolvedValue({ userId: "user_clerk_3" });
      clerkMocks.currentUser.mockResolvedValue(clerkProfile());

      const { getSessionUser } = await import("@/lib/auth-user");
      await expect(getSessionUser()).resolves.toEqual({
        id: "app-user-3",
        email: "acme@example.com",
      });
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: "app-user-3" },
        data: { clerkUserId: "user_clerk_3" },
        select: { id: true, email: true },
      });
    });

    it("creates an app user for a new Clerk account", async () => {
      clerkMocks.auth.mockResolvedValue({ userId: "user_clerk_4" });
      clerkMocks.currentUser.mockResolvedValue(
        clerkProfile({ fullName: "  ", emailAddresses: [{ id: "email-1", emailAddress: "shop@example.com" }] }),
      );

      const { getSessionUser } = await import("@/lib/auth-user");
      await expect(getSessionUser()).resolves.toEqual({
        id: APP_ID,
        email: "shop@example.com",
      });
      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          id: APP_ID,
          clerkUserId: "user_clerk_4",
          email: "shop@example.com",
          name: "shop",
          companyName: "My business",
          address: "—",
        }),
        select: { id: true, email: true },
      });
    });

    it("uses the first email when the primary id does not match", async () => {
      clerkMocks.auth.mockResolvedValue({ userId: "user_clerk_5" });
      clerkMocks.currentUser.mockResolvedValue(
        clerkProfile({
          fullName: null,
          primaryEmailAddressId: "missing",
          emailAddresses: [{ id: "other", emailAddress: "first@example.com" }],
        }),
      );

      const { getSessionUser } = await import("@/lib/auth-user");
      const result = await getSessionUser();

      expect(result?.email).toBe("first@example.com");
      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ name: "first" }),
        select: { id: true, email: true },
      });
    });

    it("uses a placeholder email when Clerk has none", async () => {
      clerkMocks.auth.mockResolvedValue({ userId: "user_clerk_6" });
      clerkMocks.currentUser.mockResolvedValue(
        clerkProfile({
          fullName: "Named",
          emailAddresses: [],
          primaryEmailAddressId: null,
        }),
      );

      const { getSessionUser } = await import("@/lib/auth-user");
      await expect(getSessionUser()).resolves.toMatchObject({
        email: "user_clerk_6@users.invalid",
      });
    });

    it("does not reuse an email already linked to another Clerk user", async () => {
      mockPrisma.seed(
        createDefaultUserRow({
          id: "app-user-7",
          email: "acme@example.com",
          clerkUserId: "user_other",
        }),
      );
      clerkMocks.auth.mockResolvedValue({ userId: "user_clerk_7" });
      clerkMocks.currentUser.mockResolvedValue(clerkProfile({ fullName: "Acme Owner" }));

      const { getSessionUser } = await import("@/lib/auth-user");
      await expect(getSessionUser()).resolves.toMatchObject({
        email: "user_clerk_7@users.invalid",
      });
    });

    it("returns the existing row when create hits a unique race", async () => {
      mockPrisma.seed(
        createDefaultUserRow({
          id: "app-user-8",
          clerkUserId: "user_clerk_8",
          email: "race@example.com",
        }),
      );
      clerkMocks.auth.mockResolvedValue({ userId: "user_clerk_8" });
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);
      mockPrisma.user.create.mockRejectedValueOnce(
        new Prisma.PrismaClientKnownRequestError("Unique", {
          code: "P2002",
          clientVersion: "test",
        }),
      );
      clerkMocks.currentUser.mockResolvedValue(clerkProfile());

      const { getSessionUser } = await import("@/lib/auth-user");
      await expect(getSessionUser()).resolves.toEqual({
        id: "app-user-8",
        email: "race@example.com",
      });
    });

    it("returns null when a unique race cannot be resolved", async () => {
      clerkMocks.auth.mockResolvedValue({ userId: "user_clerk_9" });
      clerkMocks.currentUser.mockResolvedValue(clerkProfile());
      mockPrisma.user.create.mockRejectedValueOnce(
        new Prisma.PrismaClientKnownRequestError("Unique", {
          code: "P2002",
          clientVersion: "test",
        }),
      );

      const { getSessionUser } = await import("@/lib/auth-user");
      await expect(getSessionUser()).resolves.toBeNull();
    });

    it("rethrows unexpected database errors", async () => {
      clerkMocks.auth.mockResolvedValue({ userId: "user_clerk_10" });
      clerkMocks.currentUser.mockResolvedValue(clerkProfile());
      mockPrisma.user.create.mockRejectedValueOnce(new Error("db down"));

      const { getSessionUser } = await import("@/lib/auth-user");
      await expect(getSessionUser()).rejects.toThrow("db down");
    });
  });

  describe("ensureAppUser", () => {
    it("does nothing when the app user already exists", async () => {
      mockPrisma.seed(createDefaultUserRow({ id: "app-user-11" }));

      const { ensureAppUser } = await import("@/lib/auth-user");
      await ensureAppUser({ id: "app-user-11", email: "user@example.com" });

      expect(mockPrisma.user.create).not.toHaveBeenCalled();
    });

    it("does nothing when the app user row is missing", async () => {
      const { ensureAppUser } = await import("@/lib/auth-user");
      await expect(
        ensureAppUser({ id: "missing-user", email: "missing@example.com" }),
      ).resolves.toBeUndefined();
    });
  });

  describe("getUserSettingsProfile", () => {
    it("returns the saved profile", async () => {
      mockPrisma.seed(
        createDefaultUserRow({
          id: "app-user-12",
          companyName: "Existing Co",
          gstScheme: "composition",
        }),
      );

      const { getUserSettingsProfile } = await import("@/lib/auth-user");
      const profile = await getUserSettingsProfile({
        id: "app-user-12",
        email: "user@example.com",
      });

      expect(profile).toMatchObject({
        companyName: "Existing Co",
        gstScheme: "composition",
      });
    });
  });

  describe("requireAppUser", () => {
    it("returns null when unauthenticated", async () => {
      clerkMocks.auth.mockResolvedValue({ userId: null });

      const { requireAppUser } = await import("@/lib/auth-user");
      await expect(requireAppUser()).resolves.toBeNull();
    });

    it("returns the app user when authenticated", async () => {
      mockPrisma.seed(
        createDefaultUserRow({
          id: "app-user-13",
          clerkUserId: "user_clerk_13",
          email: "ready@example.com",
        }),
      );
      clerkMocks.auth.mockResolvedValue({ userId: "user_clerk_13" });

      const { requireAppUser } = await import("@/lib/auth-user");
      await expect(requireAppUser()).resolves.toEqual({
        id: "app-user-13",
        email: "ready@example.com",
      });
    });
  });
});
