import { Prisma } from "@/generated/prisma/client";
import { cache } from "react";
import type { User as SupabaseUser } from "@supabase/supabase-js";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

/**
 * Read the user from the session cookie (no Auth HTTP round-trip).
 * Safe here because `middleware` already calls `getUser()` on app routes.
 * Wrapped in React `cache()` so multiple calls in one RSC request share work.
 */
export const getSessionUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.user ?? null;
});

function buildNewUserData(user: SupabaseUser) {
  const email = user.email ?? `${user.id}@users.invalid`;
  const meta = user.user_metadata as Record<string, unknown> | undefined;
  const name =
    (typeof meta?.full_name === "string" && meta.full_name) ||
    (typeof meta?.name === "string" && meta.name) ||
    email.split("@")[0] ||
    "User";
  const companyName =
    (typeof meta?.company_name === "string" && meta.company_name) ||
    "My business";
  const address =
    (typeof meta?.address === "string" && meta.address) || "—";

  return {
    email,
    name,
    companyName,
    invoicePrefix: "INV",
    address,
  };
}

async function createAppUserIfMissing(user: SupabaseUser) {
  try {
    await prisma.user.create({
      data: {
        id: user.id,
        ...buildNewUserData(user),
      },
    });
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      return;
    }
    throw e;
  }
}

/**
 * Ensure a `public.users` row exists. Existing users: one cheap SELECT.
 * New users only: INSERT (no createMany on every navigation).
 */
export const ensureAppUser = cache(async (user: SupabaseUser) => {
  const existing = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true },
  });
  if (existing) return;
  await createAppUserIfMissing(user);
});

const settingsProfileSelect = {
  companyName: true,
  address: true,
  phone: true,
  gstNumber: true,
  companyLogoUrl: true,
  invoicePrefix: true,
  businessType: true,
  gstScheme: true,
  stateCode: true,
} as const;

/** Settings page: one SELECT for existing users; create only when missing. */
export const getUserSettingsProfile = cache(async (user: SupabaseUser) => {
  const profile = await prisma.user.findUnique({
    where: { id: user.id },
    select: settingsProfileSelect,
  });
  if (profile) return profile;

  await createAppUserIfMissing(user);
  return prisma.user.findUnique({
    where: { id: user.id },
    select: settingsProfileSelect,
  });
});

/** Auth gate used by Server Components: session user + DB row. */
export const requireAppUser = cache(async () => {
  const user = await getSessionUser();
  if (!user) return null;
  await ensureAppUser(user);
  return user;
});
