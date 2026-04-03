import { Prisma } from "@/generated/prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { ensureAppUser, getSessionUser } from "@/lib/auth-user";
import { productToJson } from "@/lib/product-json";
import { prisma } from "@/lib/prisma";

const gstRateSchema = z.union([
  z.literal(0),
  z.literal(5),
  z.literal(12),
  z.literal(18),
  z.literal(28),
]);

const createBodySchema = z.object({
  name: z.string().min(1, "Name required"),
  sku: z.string().optional().nullable(),
  barcode: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  quantity: z.coerce.number().min(0),
  unitPrice: z.coerce.number().min(0),
  taxRate: z.preprocess(
    (v) => (typeof v === "string" ? Number(v) : v),
    gstRateSchema,
  ),
  isActive: z.boolean().optional(),
});

function normalizeOptionalCode(v: string | null | undefined) {
  const t = v?.trim();
  return t ? t : null;
}

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await ensureAppUser(user);

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();

  const products = await prisma.product.findMany({
    where: {
      userId: user.id,
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { sku: { contains: q, mode: "insensitive" } },
              { barcode: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: [{ name: "asc" }],
  });

  return NextResponse.json({
    products: products.map(productToJson),
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

  const parsed = createBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const sku = normalizeOptionalCode(parsed.data.sku ?? undefined);
  const barcode = normalizeOptionalCode(parsed.data.barcode ?? undefined);

  try {
    const product = await prisma.product.create({
      data: {
        userId: user.id,
        name: parsed.data.name.trim(),
        sku,
        barcode,
        description: parsed.data.description?.trim() || null,
        quantity: new Prisma.Decimal(parsed.data.quantity),
        unitPrice: new Prisma.Decimal(parsed.data.unitPrice),
        taxRate: new Prisma.Decimal(parsed.data.taxRate),
        isActive: parsed.data.isActive ?? true,
      },
    });
    return NextResponse.json({ product: productToJson(product) });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json(
        {
          error:
            "A product with this SKU or barcode already exists. Change SKU/barcode or edit the existing product.",
        },
        { status: 409 },
      );
    }
    throw e;
  }
}
