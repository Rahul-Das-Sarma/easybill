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

/**
 * Ensure a `public.users` row exists. Hot path is a single insert that
 * no-ops when the row already exists (no prior SELECT on every navigation).
 */
export const ensureAppUser = cache(async (user: SupabaseUser) => {
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

  await prisma.user.createMany({
    data: [
      {
        id: user.id,
        email,
        name,
        companyName,
        invoicePrefix: "INV",
        address,
      },
    ],
    skipDuplicates: true,
  });
});

/** Auth gate used by Server Components: session user + DB row. */
export const requireAppUser = cache(async () => {
  const user = await getSessionUser();
  if (!user) return null;
  await ensureAppUser(user);
  return user;
});
