import { Prisma } from "@/generated/prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { ensureAppUser, getSessionUser } from "@/lib/auth-user";
import { productToJson } from "@/lib/product-json";
import { normalizeProductNameForStorage } from "@/lib/product-name";
import { prisma } from "@/lib/prisma";

const gstRateSchema = z.union([
  z.literal(0),
  z.literal(5),
  z.literal(12),
  z.literal(18),
  z.literal(28),
]);

const patchBodySchema = z
  .object({
    name: z.string().min(1).optional(),
    sku: z.string().optional().nullable(),
    barcode: z.string().optional().nullable(),
    description: z.string().optional().nullable(),
    quantity: z.coerce.number().min(0).optional(),
    unitPrice: z.coerce.number().min(0).optional(),
    taxRate: z.preprocess(
      (v) => (v === undefined ? undefined : typeof v === "string" ? Number(v) : v),
      gstRateSchema.optional(),
    ),
    isActive: z.boolean().optional(),
  })
  .strict();

function normalizeOptionalCode(v: string | null | undefined) {
  const t = v?.trim();
  return t ? t : null;
}

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await ensureAppUser(user);

  const { id } = await params;
  const product = await prisma.product.findFirst({
    where: { id, userId: user.id },
  });
  if (!product) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ product: productToJson(product) });
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

  const parsed = patchBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const existing = await prisma.product.findFirst({
    where: { id, userId: user.id },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const d = parsed.data;
  const data: Prisma.ProductUpdateInput = {};

  if (d.name !== undefined) data.name = normalizeProductNameForStorage(d.name);
  if (d.sku !== undefined) data.sku = normalizeOptionalCode(d.sku);
  if (d.barcode !== undefined) data.barcode = normalizeOptionalCode(d.barcode);
  if (d.description !== undefined) data.description = d.description?.trim() || null;
  if (d.quantity !== undefined) data.quantity = new Prisma.Decimal(d.quantity);
  if (d.unitPrice !== undefined) data.unitPrice = new Prisma.Decimal(d.unitPrice);
  if (d.taxRate !== undefined) data.taxRate = new Prisma.Decimal(d.taxRate);
  if (d.isActive !== undefined) data.isActive = d.isActive;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  try {
    const product = await prisma.product.update({
      where: { id },
      data,
    });
    return NextResponse.json({ product: productToJson(product) });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json(
        {
          error:
            "A product with this SKU or barcode already exists. Change SKU/barcode or edit the other product.",
        },
        { status: 409 },
      );
    }
    throw e;
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await ensureAppUser(user);

  const { id } = await params;

  const existing = await prisma.product.findFirst({
    where: { id, userId: user.id },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.product.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
