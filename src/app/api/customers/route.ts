import { NextResponse } from "next/server";
import { z } from "zod";

import { ensureAppUser, getSessionUser } from "@/lib/auth-user";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  name: z.string().min(1, "Name required"),
  email: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    z.string().email().optional(),
  ),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  gstNumber: z.string().optional().nullable(),
});

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

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const customer = await prisma.customer.create({
    data: {
      userId: user.id,
      name: parsed.data.name.trim(),
      email: parsed.data.email?.trim() || null,
      phone: parsed.data.phone?.trim() || null,
      address: parsed.data.address?.trim() || null,
      gstNumber: parsed.data.gstNumber?.trim() || null,
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      gstNumber: true,
    },
  });

  return NextResponse.json({ customer });
}
