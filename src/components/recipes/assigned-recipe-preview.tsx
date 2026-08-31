"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { RecipePreviewContentSkeleton } from "@/components/ui/content-skeletons";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";

type RecipePreview = {
  id: string;
  name: string;
  components: {
    rawMaterialId: string;
    quantityPerUnit: number;
    rawMaterial: { name: string; sku: string | null; quantity: number };
  }[];
};

export function AssignedRecipePreview({
  productId,
  productName,
}: {
  productId: string;
  productName: string;
}) {
  const [recipe, setRecipe] = useState<RecipePreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setMissing(false);

    void fetch(`/api/products/${productId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then(async (data: { product?: { recipeId: string | null } } | null) => {
        const recipeId = data?.product?.recipeId;
        if (!recipeId) {
          if (!cancelled) setMissing(true);
          return;
        }
        const recipeRes = await fetch(`/api/recipes/${recipeId}`);
        if (!recipeRes.ok) {
          if (!cancelled) setMissing(true);
          return;
        }
        const recipeData = (await recipeRes.json()) as { recipe?: RecipePreview };
        if (!cancelled) setRecipe(recipeData.recipe ?? null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [productId]);

  if (loading) {
    return (
      <section className="rounded-lg border border-border bg-muted/20 p-4">
        <p className="text-sm font-medium">Recipe for {productName}</p>
        <p className="text-xs text-muted-foreground">
          Ingredients per 1 unit of output
        </p>
        <RecipePreviewContentSkeleton />
      </section>
    );
  }

  if (missing || !recipe) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-muted/30 p-4">
        <p className="text-sm text-muted-foreground">
          No recipe assigned to <span className="font-medium">{productName}</span>.
          Assign an existing formula or create one, then link it from Inventory.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href={`/inventory/${productId}`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Assign recipe
          </Link>
          <Link
            href="/recipes/new"
            className={cn(buttonVariants({ size: "sm" }))}
          >
            Create recipe
          </Link>
        </div>
      </div>
    );
  }

  return (
    <section className="rounded-lg border border-border bg-muted/20 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium">Recipe: {recipe.name}</p>
          <p className="text-xs text-muted-foreground">
            Reused formula — ingredients per 1 unit of {productName}
          </p>
        </div>
        <Link
          href={`/recipes/${recipe.id}`}
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
        >
          Edit formula
        </Link>
      </div>
      {recipe.components.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          This recipe has no ingredients yet.
        </p>
      ) : (
        <ul className="mt-3 space-y-1 text-sm">
          {recipe.components.map((c) => (
            <li
              key={c.rawMaterialId}
              className="flex justify-between gap-2 text-muted-foreground"
            >
              <span>{c.rawMaterial.name}</span>
              <span className="tabular-nums">
                {c.quantityPerUnit} / unit · stock {c.rawMaterial.quantity}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
