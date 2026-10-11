import { NextResponse } from "next/server";
import { z } from "zod";

import { ensureAppUser, getSessionUser } from "@/lib/auth-user";
import { stateCodeFromGstin } from "@/lib/gst-india";
import { prisma } from "@/lib/prisma";

const patchSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  email: z
    .string()
    .email()
    .optional()
    .nullable()
    .or(z.literal("")),
  phone: z.string().max(40).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  gstNumber: z.string().max(40).optional().nullable(),
  stateCode: z.string().max(2).optional().nullable(),
  pincode: z.string().max(6).optional().nullable(),
});

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await ensureAppUser(user);

  const { id } = await params;
  const customer = await prisma.customer.findFirst({
    where: { id, userId: user.id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      address: true,
      gstNumber: true,
      stateCode: true,
    },
  });

  if (!customer) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ customer });
}

export async function PATCH(req: Request, { params }: Params) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await ensureAppUser(user);

  const { id } = await params;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const existing = await prisma.customer.findFirst({
    where: { id, userId: user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = parsed.data;
  const gstNumber = body.gstNumber?.trim() || null;
  const stateCode =
    body.stateCode?.trim() ||
    stateCodeFromGstin(gstNumber ?? existing.gstNumber) ||
    existing.stateCode;

  const updated = await prisma.customer.update({
    where: { id },
    data: {
      ...(body.name !== undefined ? { name: body.name.trim() } : {}),
      ...(body.email !== undefined
        ? { email: body.email?.trim() || null }
        : {}),
      ...(body.phone !== undefined
        ? { phone: body.phone?.trim() || null }
        : {}),
      ...(body.address !== undefined
        ? { address: body.address?.trim() || null }
        : {}),
      ...(body.pincode !== undefined
        ? { pincode: body.pincode?.trim() || null }
        : {}),
      ...(body.gstNumber !== undefined ? { gstNumber } : {}),
      ...(body.stateCode !== undefined || body.gstNumber !== undefined
        ? { stateCode }
        : {}),
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      address: true,
      gstNumber: true,
      stateCode: true,
    },
  });

  return NextResponse.json({ customer: updated });
}
