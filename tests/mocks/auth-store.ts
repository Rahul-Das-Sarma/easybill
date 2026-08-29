import type { User as SupabaseUser } from "@supabase/supabase-js";
import { vi } from "vitest";

export type MockUserRow = {
  id: string;
  email: string;
  name: string;
  companyName: string;
  address: string;
  phone: string | null;
  invoicePrefix: string;
  businessType: "trading" | "manufacturer";
  businessTypeChosen: boolean;
  onboardingCompleted: boolean;
  gstScheme: "regular" | "composition" | "unregistered";
  gstNumber: string | null;
  stateCode: string | null;
  companyLogoUrl: string | null;
};

export function createDefaultUserRow(
  overrides: Partial<MockUserRow> & { id: string },
): MockUserRow {
  return {
    email: "user@example.com",
    name: "Test User",
    companyName: "My business",
    address: "—",
    phone: null,
    invoicePrefix: "INV",
    businessType: "trading",
    businessTypeChosen: false,
    onboardingCompleted: false,
    gstScheme: "regular",
    gstNumber: null,
    stateCode: null,
    companyLogoUrl: null,
    ...overrides,
  };
}

export function createMockPrisma() {
  const users = new Map<string, MockUserRow>();

  const user = {
    findUnique: vi.fn(
      async ({
        where,
        select,
      }: {
        where: { id: string };
        select?: Record<string, boolean>;
      }) => {
        const row = users.get(where.id);
        if (!row) return null;
        if (!select) return row;
        return Object.fromEntries(
          Object.keys(select).map((key) => [key, row[key as keyof MockUserRow]]),
        );
      },
    ),
    create: vi.fn(async ({ data }: { data: MockUserRow }) => {
      if (users.has(data.id)) {
        const { Prisma } = await import("@/generated/prisma/client");
        throw new Prisma.PrismaClientKnownRequestError("Unique constraint", {
          code: "P2002",
          clientVersion: "test",
        });
      }
      users.set(data.id, { ...data });
      return data;
    }),
    update: vi.fn(
      async ({
        where,
        data,
        select,
      }: {
        where: { id: string };
        data: Partial<MockUserRow>;
        select?: Record<string, boolean>;
      }) => {
        const existing = users.get(where.id);
        if (!existing) throw new Error("User not found");
        const updated = { ...existing, ...data };
        users.set(where.id, updated);
        if (!select) return updated;
        return Object.fromEntries(
          Object.keys(select).map((key) => [
            key,
            updated[key as keyof MockUserRow],
          ]),
        );
      },
    ),
  };

  return {
    user,
    _users: users,
    seed(row: MockUserRow) {
      users.set(row.id, row);
    },
    reset() {
      users.clear();
      user.findUnique.mockClear();
      user.create.mockClear();
      user.update.mockClear();
    },
  };
}

export function createSupabaseUser(
  overrides: Partial<SupabaseUser> & { id: string },
): SupabaseUser {
  return {
    id: overrides.id,
    email: overrides.email ?? "user@example.com",
    app_metadata: {},
    user_metadata: overrides.user_metadata ?? {},
    aud: "authenticated",
    created_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  } as SupabaseUser;
}
