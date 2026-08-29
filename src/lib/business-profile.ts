import { cache } from "react";

import { ensureAppUser, getSessionUser } from "@/lib/auth-user";
import { prisma } from "@/lib/prisma";

export type BusinessProfile = {
  businessType: "trading" | "manufacturer";
  businessTypeChosen: boolean;
  isManufacturer: boolean;
};

export const getBusinessProfile = cache(async (): Promise<BusinessProfile | null> => {
  const user = await getSessionUser();
  if (!user) return null;

  let row = await prisma.user.findUnique({
    where: { id: user.id },
    select: { businessType: true, businessTypeChosen: true },
  });

  if (!row) {
    await ensureAppUser(user);
    row = await prisma.user.findUnique({
      where: { id: user.id },
      select: { businessType: true, businessTypeChosen: true },
    });
  }

  if (!row) return null;

  return {
    businessType: row.businessType,
    businessTypeChosen: row.businessTypeChosen,
    isManufacturer: row.businessType === "manufacturer",
  };
});
