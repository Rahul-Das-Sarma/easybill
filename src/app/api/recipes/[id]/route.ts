import { Prisma } from "@/generated/prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { ensureAppUser, getSessionUser } from "@/lib/auth-user";
import { prisma } from "@/lib/prisma";
import { recipeInclude, recipeToJson } from "@/lib/recipe-json";
import { syncRecipeOutputProduct } from "@/lib/sync-recipe-product";

type Ctx = { params: Promise<{ id: string }> };

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

const patchSchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    description: z.string().max(500).optional().nullable(),
    unitPrice: z.coerce.number().min(0).optional(),
    taxRate: z.preprocess(
      (v) => (v === undefined ? undefined : typeof v === "string" ? Number(v) : v),
      gstRateSchema.optional(),
    ),
    components: z.array(componentSchema).optional(),
  })
  .strict();

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

export async function GET(_req: Request, ctx: Ctx) {
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

  const { id } = await ctx.params;
  const recipe = await prisma.recipe.findFirst({
    where: { id, userId: user.id },
    include: recipeInclude,
  });

  if (!recipe) {
    return NextResponse.json({ error: "Recipe not found." }, { status: 404 });
  }

  return NextResponse.json({ recipe: recipeToJson(recipe) });
}

export async function PATCH(req: Request, ctx: Ctx) {
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

  const { id } = await ctx.params;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid recipe payload" }, { status: 400 });
  }

  const existing = await prisma.recipe.findFirst({
    where: { id, userId: user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Recipe not found." }, { status: 404 });
  }

  if (parsed.data.components) {
    const componentError = await validateComponents(user.id, parsed.data.components);
    if (componentError) {
      return NextResponse.json({ error: componentError }, { status: 400 });
    }
  }

  const recipe = await prisma.$transaction(async (tx) => {
    const updateData: Prisma.RecipeUpdateInput = {};
    if (parsed.data.name !== undefined) updateData.name = parsed.data.name.trim();
    if (parsed.data.description !== undefined) {
      updateData.description = parsed.data.description?.trim() || null;
    }
    if (parsed.data.unitPrice !== undefined) {
      updateData.unitPrice = new Prisma.Decimal(parsed.data.unitPrice);
    }
    if (parsed.data.taxRate !== undefined) {
      updateData.taxRate = new Prisma.Decimal(parsed.data.taxRate);
    }

    if (Object.keys(updateData).length > 0) {
      await tx.recipe.update({ where: { id }, data: updateData });
    }

    if (parsed.data.components) {
      await tx.recipeComponent.deleteMany({ where: { recipeId: id } });
      if (parsed.data.components.length > 0) {
        await tx.recipeComponent.createMany({
          data: parsed.data.components.map((c) => ({
            id: crypto.randomUUID(),
            recipeId: id,
            rawMaterialId: c.rawMaterialId,
            quantityPerUnit: new Prisma.Decimal(c.quantityPerUnit),
          })),
        });
      }
    }

    const current = await tx.recipe.findUniqueOrThrow({ where: { id } });
    await syncRecipeOutputProduct(tx, user.id, current);

    return tx.recipe.findUniqueOrThrow({
      where: { id },
      include: recipeInclude,
    });
  });

  return NextResponse.json({ recipe: recipeToJson(recipe) });
}

export async function DELETE(_req: Request, ctx: Ctx) {
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

  const { id } = await ctx.params;
  const existing = await prisma.recipe.findFirst({
    where: { id, userId: user.id },
    select: { id: true, outputProductId: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Recipe not found." }, { status: 404 });
  }

  await prisma.$transaction(async (tx) => {
    if (existing.outputProductId) {
      await tx.product.update({
        where: { id: existing.outputProductId },
        data: { recipeId: null },
      });
    }
    await tx.recipe.delete({ where: { id } });
  });

  return NextResponse.json({ ok: true });
}
