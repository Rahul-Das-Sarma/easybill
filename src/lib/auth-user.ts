import { auth, currentUser } from "@clerk/nextjs/server";
import { Prisma } from "@/generated/prisma/client";
import { cache } from "react";

import { prisma } from "@/lib/prisma";

/** App user id is the Prisma UUID, not the Clerk user id. */
export type AppSessionUser = {
  id: string;
  email: string;
};

type ClerkEmail = { id: string; emailAddress: string };

function displayName(fullName: string | null | undefined, email: string) {
  const trimmed = fullName?.trim();
  if (trimmed) return trimmed;
  return email.split("@")[0] || "User";
}

function primaryEmail(
  addresses: ClerkEmail[],
  primaryId: string | null | undefined,
  clerkUserId: string,
) {
  const primary = addresses.find((address) => address.id === primaryId);
  return (
    primary?.emailAddress ??
    addresses[0]?.emailAddress ??
    `${clerkUserId}@users.invalid`
  );
}

async function createAppUser(input: {
  clerkUserId: string;
  email: string;
  name: string;
}) {
  try {
    return await prisma.user.create({
      data: {
        id: crypto.randomUUID(),
        clerkUserId: input.clerkUserId,
        email: input.email,
        name: input.name,
        companyName: "My business",
        invoicePrefix: "INV",
        address: "—",
      },
      select: { id: true, email: true },
    });
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      return prisma.user.findUnique({
        where: { clerkUserId: input.clerkUserId },
        select: { id: true, email: true },
      });
    }
    throw e;
  }
}

/**
 * Resolve the signed-in Clerk user to the EasyBill `users` row.
 * Existing businesses are matched by email the first time they sign in.
 */
export const getSessionUser = cache(async (): Promise<AppSessionUser | null> => {
  const { userId } = await auth();
  if (!userId) return null;

  const linked = await prisma.user.findUnique({
    where: { clerkUserId: userId },
    select: { id: true, email: true },
  });
  if (linked) return linked;

  const clerk = await currentUser();
  if (!clerk) return null;

  const email = primaryEmail(
    clerk.emailAddresses,
    clerk.primaryEmailAddressId,
    userId,
  );
  const name = displayName(clerk.fullName, email);

  const byEmail = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, clerkUserId: true },
  });

  if (byEmail && !byEmail.clerkUserId) {
    return prisma.user.update({
      where: { id: byEmail.id },
      data: { clerkUserId: userId },
      select: { id: true, email: true },
    });
  }

  return createAppUser({
    clerkUserId: userId,
    email: byEmail ? `${userId}@users.invalid` : email,
    name,
  });
});

/** The session resolver already creates the row. This guards older call sites. */
export const ensureAppUser = cache(async (user: AppSessionUser) => {
  const existing = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true },
  });
  if (existing) return;
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
  city: true,
  pincode: true,
  einvoiceUsername: true,
  einvoiceClientId: true,
  einvoiceEnv: true,
  einvoicePasswordEnc: true,
  einvoiceSecretEnc: true,
  einvoicePublicKey: true,
} as const;

export const getUserSettingsProfile = cache(async (user: AppSessionUser) => {
  return prisma.user.findUnique({
    where: { id: user.id },
    select: settingsProfileSelect,
  });
});

export const requireAppUser = cache(async () => {
  const user = await getSessionUser();
  if (!user) return null;
  await ensureAppUser(user);
  return user;
});
