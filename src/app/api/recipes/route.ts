import { Prisma } from "@/generated/prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { ensureAppUser, getSessionUser } from "@/lib/auth-user";
import { prisma } from "@/lib/prisma";
import { recipeInclude, recipeToJson } from "@/lib/recipe-json";
import { syncRecipeOutputProduct } from "@/lib/sync-recipe-product";

const gstRateSchema = z.union([
  z.literal(0),
  z.literal(5),
  z.literal(12),
  z.literal(18),
  z.literal(28),
]);

const componentSchema = z.object({
  rawMaterialId: z.string().uuid(),
  quantityPerUnit: z.coerce.number().positive(),
});

const createSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional().nullable(),
  unitPrice: z.coerce.number().min(0).default(0),
  taxRate: z.preprocess(
    (v) => (typeof v === "string" ? Number(v) : v),
    gstRateSchema.default(18),
  ),
  components: z.array(componentSchema).default([]),
});

async function requireManufacturer(userId: string) {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { businessType: true },
  });
  return u?.businessType === "manufacturer";
}

async function validateComponents(
  userId: string,
  components: z.infer<typeof componentSchema>[],
) {
  const rawIds = components.map((c) => c.rawMaterialId);
  if (new Set(rawIds).size !== rawIds.length) {
    return "Duplicate raw materials in formula.";
  }
  if (rawIds.length === 0) return null;

  const materials = await prisma.product.findMany({
    where: {
      userId,
      id: { in: rawIds },
      kind: "raw_material",
    },
    select: { id: true },
  });
  if (materials.length !== rawIds.length) {
    return "Every formula line must be a raw material you own.";
  }
  return null;
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await ensureAppUser(user);
  if (!(await requireManufacturer(user.id))) {
    return NextResponse.json(
      { error: "Recipes are only available for manufacturer businesses." },
      { status: 403 },
    );
  }

  const recipes = await prisma.recipe.findMany({
    where: { userId: user.id },
    orderBy: { name: "asc" },
    include: recipeInclude,
  });

  return NextResponse.json({
    recipes: recipes.map((r) => recipeToJson(r)),
  });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await ensureAppUser(user);
  if (!(await requireManufacturer(user.id))) {
    return NextResponse.json(
      { error: "Recipes are only available for manufacturer businesses." },
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
    return NextResponse.json({ error: "Invalid recipe payload" }, { status: 400 });
  }

  const componentError = await validateComponents(user.id, parsed.data.components);
  if (componentError) {
    return NextResponse.json({ error: componentError }, { status: 400 });
  }

  const recipe = await prisma.$transaction(async (tx) => {
    const created = await tx.recipe.create({
      data: {
        userId: user.id,
        name: parsed.data.name.trim(),
        description: parsed.data.description?.trim() || null,
        unitPrice: new Prisma.Decimal(parsed.data.unitPrice),
        taxRate: new Prisma.Decimal(parsed.data.taxRate),
      },
    });

    if (parsed.data.components.length > 0) {
      await tx.recipeComponent.createMany({
        data: parsed.data.components.map((c) => ({
          id: crypto.randomUUID(),
          recipeId: created.id,
          rawMaterialId: c.rawMaterialId,
          quantityPerUnit: new Prisma.Decimal(c.quantityPerUnit),
        })),
      });
    }

    await syncRecipeOutputProduct(tx, user.id, created);

    return tx.recipe.findUniqueOrThrow({
      where: { id: created.id },
      include: recipeInclude,
    });
  });

  return NextResponse.json({ recipe: recipeToJson(recipe) }, { status: 201 });
}
