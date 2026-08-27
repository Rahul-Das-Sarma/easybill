import { Prisma } from "@/generated/prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { ensureAppUser, getSessionUser } from "@/lib/auth-user";
import { formatProductNameForDisplay } from "@/lib/product-name";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ id: string }> };

const putSchema = z.object({
  components: z.array(
    z.object({
      rawMaterialId: z.string().uuid(),
      quantityPerUnit: z.coerce.number().positive(),
    }),
  ),
});

async function requireManufacturer(userId: string) {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { businessType: true },
  });
  return u?.businessType === "manufacturer";
}

/** List BOM lines for a finished good. */
export async function GET(_req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await ensureAppUser(user);
  if (!(await requireManufacturer(user.id))) {
    return NextResponse.json(
      { error: "BOM is only available for manufacturer businesses." },
      { status: 403 },
    );
  }

  const { id: finishedGoodId } = await ctx.params;

  const fg = await prisma.product.findFirst({
    where: {
      id: finishedGoodId,
      userId: user.id,
      kind: "finished_good",
    },
    select: { id: true, name: true },
  });
  if (!fg) {
    return NextResponse.json(
      { error: "Finished good not found." },
      { status: 404 },
    );
  }

  const rows = await prisma.bomComponent.findMany({
    where: { userId: user.id, finishedGoodId },
    include: {
      rawMaterial: {
        select: {
          id: true,
          name: true,
          sku: true,
          quantity: true,
          unitPrice: true,
        },
      },
    },
    orderBy: { rawMaterial: { name: "asc" } },
  });

  return NextResponse.json({
    finishedGood: {
      id: fg.id,
      name: formatProductNameForDisplay(fg.name),
    },
    components: rows.map((r) => ({
      id: r.id,
      rawMaterialId: r.rawMaterialId,
      quantityPerUnit: Number(r.quantityPerUnit),
      rawMaterial: {
        id: r.rawMaterial.id,
        name: formatProductNameForDisplay(r.rawMaterial.name),
        sku: r.rawMaterial.sku,
        quantity: Number(r.rawMaterial.quantity),
        unitPrice: Number(r.rawMaterial.unitPrice),
      },
    })),
  });
}

/** Replace entire BOM for a finished good. */
export async function PUT(req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await ensureAppUser(user);
  if (!(await requireManufacturer(user.id))) {
    return NextResponse.json(
      { error: "BOM is only available for manufacturer businesses." },
      { status: 403 },
    );
  }

  const { id: finishedGoodId } = await ctx.params;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = putSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid BOM payload" }, { status: 400 });
  }

  const fg = await prisma.product.findFirst({
    where: {
      id: finishedGoodId,
      userId: user.id,
      kind: "finished_good",
    },
    select: { id: true },
  });
  if (!fg) {
    return NextResponse.json(
      { error: "Finished good not found." },
      { status: 404 },
    );
  }

  const rawIds = parsed.data.components.map((c) => c.rawMaterialId);
  if (new Set(rawIds).size !== rawIds.length) {
    return NextResponse.json(
      { error: "Duplicate raw materials in BOM." },
      { status: 400 },
    );
  }
  if (rawIds.includes(finishedGoodId)) {
    return NextResponse.json(
      { error: "A finished good cannot include itself in its BOM." },
      { status: 400 },
    );
  }

  if (rawIds.length > 0) {
    const materials = await prisma.product.findMany({
      where: {
        userId: user.id,
        id: { in: rawIds },
        kind: "raw_material",
      },
      select: { id: true },
    });
    if (materials.length !== rawIds.length) {
      return NextResponse.json(
        { error: "Every BOM line must be a raw material you own." },
        { status: 400 },
      );
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.bomComponent.deleteMany({
      where: { userId: user.id, finishedGoodId },
    });
    if (parsed.data.components.length > 0) {
      await tx.bomComponent.createMany({
        data: parsed.data.components.map((c) => ({
          id: crypto.randomUUID(),
          userId: user.id,
          finishedGoodId,
          rawMaterialId: c.rawMaterialId,
          quantityPerUnit: new Prisma.Decimal(c.quantityPerUnit),
        })),
      });
    }
  });

  return NextResponse.json({ ok: true });
}
