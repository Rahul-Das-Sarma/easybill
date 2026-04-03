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

const itemSchema = z.object({
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

const batchBodySchema = z.object({
  items: z.array(itemSchema).min(1).max(200),
});

function normalizeOptionalCode(v: string | null | undefined) {
  const t = v?.trim();
  return t ? t : null;
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

  const parsed = batchBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const items = parsed.data.items.map((row) => ({
    name: normalizeProductNameForStorage(row.name),
    sku: normalizeOptionalCode(row.sku ?? undefined),
    barcode: normalizeOptionalCode(row.barcode ?? undefined),
    description: row.description?.trim() || null,
    quantity: row.quantity,
    unitPrice: row.unitPrice,
    taxRate: row.taxRate,
    isActive: row.isActive ?? true,
  }));

  const seenSku = new Set<string>();
  const seenBarcode = new Set<string>();
  for (const row of items) {
    if (row.sku) {
      const key = row.sku.toLowerCase();
      if (seenSku.has(key)) {
        return NextResponse.json(
          {
            error:
              "Duplicate SKU in this batch. Each SKU must be unique (or leave blank).",
          },
          { status: 400 },
        );
      }
      seenSku.add(key);
    }
    if (row.barcode) {
      const key = row.barcode.toLowerCase();
      if (seenBarcode.has(key)) {
        return NextResponse.json(
          {
            error:
              "Duplicate barcode in this batch. Each barcode must be unique (or leave blank).",
          },
          { status: 400 },
        );
      }
      seenBarcode.add(key);
    }
  }

  try {
    const created = await prisma.$transaction(
      items.map((row) =>
        prisma.product.create({
          data: {
            userId: user.id,
            name: row.name,
            sku: row.sku,
            barcode: row.barcode,
            description: row.description,
            quantity: new Prisma.Decimal(row.quantity),
            unitPrice: new Prisma.Decimal(row.unitPrice),
            taxRate: new Prisma.Decimal(row.taxRate),
            isActive: row.isActive,
          },
        }),
      ),
    );

    return NextResponse.json({
      created: created.length,
      products: created.map(productToJson),
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json(
        {
          error:
            "One or more products use a SKU or barcode that already exists. Fix duplicates and try again.",
        },
        { status: 409 },
      );
    }
    throw e;
  }
}
