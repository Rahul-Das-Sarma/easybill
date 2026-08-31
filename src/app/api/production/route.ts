import { Prisma } from "@/generated/prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { ensureAppUser, getSessionUser } from "@/lib/auth-user";
import { formatProductNameForDisplay } from "@/lib/product-name";
import { prisma } from "@/lib/prisma";
import { resolveProductBom } from "@/lib/resolve-product-bom";

const createSchema = z.object({
  finishedGoodId: z.string().uuid(),
  quantity: z.coerce.number().positive(),
  notes: z.string().max(500).optional().nullable(),
});

async function requireManufacturer(userId: string) {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { businessType: true },
  });
  return u?.businessType === "manufacturer";
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await ensureAppUser(user);
  if (!(await requireManufacturer(user.id))) {
    return NextResponse.json(
      { error: "Production is only available for manufacturer businesses." },
      { status: 403 },
    );
  }

  const runs = await prisma.productionRun.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      finishedGood: { select: { id: true, name: true, sku: true } },
    },
  });

  return NextResponse.json({
    runs: runs.map((r) => ({
      id: r.id,
      quantity: Number(r.quantity),
      notes: r.notes,
      createdAt: r.createdAt.toISOString(),
      finishedGood: {
        id: r.finishedGood.id,
        name: formatProductNameForDisplay(r.finishedGood.name),
        sku: r.finishedGood.sku,
      },
    })),
  });
}

/** Produce finished goods: consume BOM raw materials, increase FG stock. */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await ensureAppUser(user);
  if (!(await requireManufacturer(user.id))) {
    return NextResponse.json(
      { error: "Production is only available for manufacturer businesses." },
      { status: 403 },
    );
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid production payload" }, { status: 400 });
  }

  const { finishedGoodId, quantity, notes } = parsed.data;

  const fg = await prisma.product.findFirst({
    where: {
      id: finishedGoodId,
      userId: user.id,
      kind: "finished_good",
      isActive: true,
    },
    select: { id: true, recipeId: true },
  });
  if (!fg) {
    return NextResponse.json(
      { error: "Finished good not found." },
      { status: 404 },
    );
  }

  const resolved = await resolveProductBom(user.id, finishedGoodId);
  if (!resolved || resolved.lines.length === 0) {
    return NextResponse.json(
      {
        error:
          "This finished good has no recipe assigned. Assign a recipe on the product page or in Recipes.",
      },
      { status: 400 },
    );
  }

  const bom = resolved.lines;

  const shortages: { name: string; need: number; have: number }[] = [];
  for (const line of bom) {
    const need = line.quantityPerUnit * quantity;
    const have = line.rawMaterial.quantity;
    if (have + 1e-9 < need) {
      shortages.push({
        name: formatProductNameForDisplay(line.rawMaterial.name),
        need,
        have,
      });
    }
  }

  if (shortages.length > 0) {
    return NextResponse.json(
      {
        error: "Not enough raw material stock to produce this quantity.",
        shortages,
      },
      { status: 400 },
    );
  }

  const run = await prisma.$transaction(async (tx) => {
    for (const line of bom) {
      const consume = new Prisma.Decimal(line.quantityPerUnit * quantity);
      const updated = await tx.product.updateMany({
        where: {
          id: line.rawMaterialId,
          userId: user.id,
          quantity: { gte: consume },
        },
        data: {
          quantity: { decrement: consume },
        },
      });
      if (updated.count !== 1) {
        throw new Error("STOCK_RACE");
      }
    }

    await tx.product.update({
      where: { id: finishedGoodId },
      data: {
        quantity: { increment: new Prisma.Decimal(quantity) },
      },
    });

    return tx.productionRun.create({
      data: {
        userId: user.id,
        finishedGoodId,
        recipeId: resolved.recipeId,
        quantity: new Prisma.Decimal(quantity),
        notes: notes?.trim() || null,
      },
      include: {
        finishedGood: { select: { id: true, name: true, sku: true } },
      },
    });
  }).catch((e: unknown) => {
    if (e instanceof Error && e.message === "STOCK_RACE") {
      return null;
    }
    throw e;
  });

  if (!run) {
    return NextResponse.json(
      { error: "Stock changed while producing. Try again." },
      { status: 409 },
    );
  }

  return NextResponse.json({
    run: {
      id: run.id,
      quantity: Number(run.quantity),
      notes: run.notes,
      createdAt: run.createdAt.toISOString(),
      finishedGood: {
        id: run.finishedGood.id,
        name: formatProductNameForDisplay(run.finishedGood.name),
        sku: run.finishedGood.sku,
      },
    },
  });
}
