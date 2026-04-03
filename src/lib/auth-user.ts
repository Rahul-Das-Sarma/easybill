import type { User as SupabaseUser } from "@supabase/supabase-js";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export async function getSessionUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/** Ensures a `public.users` row exists for the Supabase auth user (required for FKs). */
export async function ensureAppUser(user: SupabaseUser) {
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

  const existing = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true, email: true },
  });

  if (!existing) {
    await prisma.user.create({
      data: {
        id: user.id,
        email,
        name,
        companyName,
        invoicePrefix: "INV",
        address,
      },
    });
    return;
  }

  if (existing.email !== email) {
    await prisma.user.update({
      where: { id: user.id },
      data: { email },
    });
  }
}
