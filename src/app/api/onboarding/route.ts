import { NextResponse } from "next/server";
import { z } from "zod";

import { ensureAppUser, getSessionUser } from "@/lib/auth-user";
import { stateCodeFromGstin } from "@/lib/gst-india";
import { prisma } from "@/lib/prisma";

const completeSchema = z.object({
  businessType: z.enum(["trading", "manufacturer"]),
  companyName: z.string().min(1).max(120),
  address: z.string().min(1).max(500),
  phone: z.string().max(40).optional().nullable(),
  invoicePrefix: z
    .string()
    .min(1)
    .max(12)
    .regex(/^[A-Za-z0-9-]+$/),
  gstScheme: z.enum(["regular", "composition", "unregistered"]),
  gstNumber: z.string().max(40).optional().nullable(),
  stateCode: z.string().max(2).optional().nullable(),
});

function onboardingSelect() {
  return {
    businessType: true,
    businessTypeChosen: true,
    onboardingCompleted: true,
    companyName: true,
    address: true,
    phone: true,
    invoicePrefix: true,
    gstScheme: true,
    gstNumber: true,
    stateCode: true,
  } as const;
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await ensureAppUser(user);

  const row = await prisma.user.findUnique({
    where: { id: user.id },
    select: onboardingSelect(),
  });

  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    onboardingCompleted: row.onboardingCompleted,
    profile: row,
    isManufacturer: row.businessType === "manufacturer",
  });
}

export async function POST(req: Request) {
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

  const parsed = completeSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const body = parsed.data;
  const gstNumber = body.gstNumber?.trim() || null;
  const stateCode =
    body.stateCode?.trim() || stateCodeFromGstin(gstNumber) || null;

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      businessType: body.businessType,
      businessTypeChosen: true,
      onboardingCompleted: true,
      companyName: body.companyName.trim(),
      address: body.address.trim(),
      phone: body.phone?.trim() || null,
      invoicePrefix: body.invoicePrefix.trim().toUpperCase(),
      gstScheme: body.gstScheme,
      gstNumber,
      stateCode,
    },
    select: onboardingSelect(),
  });

  return NextResponse.json({
    onboardingCompleted: true,
    profile: updated,
    isManufacturer: updated.businessType === "manufacturer",
  });
}
