import { NextResponse } from "next/server";
import { z } from "zod";

import { ensureAppUser, getSessionUser } from "@/lib/auth-user";
import { prisma } from "@/lib/prisma";

const chooseSchema = z.object({
  businessType: z.enum(["trading", "manufacturer"]),
});

/** Lightweight profile for sidebar / onboarding. */
export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await ensureAppUser(user);

  const row = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      businessType: true,
      businessTypeChosen: true,
      onboardingCompleted: true,
      companyName: true,
    },
  });

  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    businessType: row.businessType,
    businessTypeChosen: row.businessTypeChosen,
    onboardingCompleted: row.onboardingCompleted,
    isManufacturer: row.businessType === "manufacturer",
    companyName: row.companyName,
  });
}

/** One-time (or settings) business-type choice. */
export async function PATCH(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await ensureAppUser(user);

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = chooseSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid business type" }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      businessType: parsed.data.businessType,
      businessTypeChosen: true,
    },
    select: {
      businessType: true,
      businessTypeChosen: true,
    },
  });

  return NextResponse.json({
    businessType: updated.businessType,
    businessTypeChosen: updated.businessTypeChosen,
    isManufacturer: updated.businessType === "manufacturer",
  });
}
