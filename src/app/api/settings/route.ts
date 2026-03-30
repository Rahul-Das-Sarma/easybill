import { NextResponse } from "next/server";
import { z } from "zod";

import { ensureAppUser, getSessionUser } from "@/lib/auth-user";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  companyName: z.string().min(1).max(120),
  address: z.string().min(1).max(500),
  phone: z.string().max(40).optional().nullable(),
  gstNumber: z.string().max(40).optional().nullable(),
  invoicePrefix: z
    .string()
    .min(1)
    .max(12)
    .regex(/^[A-Za-z0-9-]+$/),
});

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await ensureAppUser(user);

  const row = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      companyName: true,
      address: true,
      phone: true,
      gstNumber: true,
      companyLogoUrl: true,
      invoicePrefix: true,
    },
  });

  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    settings: {
      companyName: row.companyName,
      address: row.address,
      phone: row.phone,
      gstNumber: row.gstNumber,
      companyLogoUrl: row.companyLogoUrl,
      invoicePrefix: row.invoicePrefix,
    },
  });
}

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

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const body = parsed.data;

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      companyName: body.companyName.trim(),
      address: body.address.trim(),
      phone: body.phone?.trim() || null,
      gstNumber: body.gstNumber?.trim() || null,
      invoicePrefix: body.invoicePrefix.trim().toUpperCase(),
    },
    select: {
      companyName: true,
      address: true,
      phone: true,
      gstNumber: true,
      companyLogoUrl: true,
      invoicePrefix: true,
    },
  });

  return NextResponse.json({ settings: updated });
}
