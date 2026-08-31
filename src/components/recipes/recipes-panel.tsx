"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { RecipeListItemsSkeleton } from "@/components/ui/content-skeletons";
import { Button } from "@/components/ui/button";
import { NumberInput } from "@/components/ui/number-input";
import { buttonVariants } from "@/components/ui/button-variants";
import type { RecipeJson } from "@/lib/recipe-json";
import { parseNumberInputValue } from "@/lib/number-input";
import { cn } from "@/lib/utils";
import { AlertTriangle, Pencil, Plus } from "lucide-react";

export function RecipesPanel() {
  const router = useRouter();
  const [recipes, setRecipes] = useState<RecipeJson[]>([]);
  const [loading, setLoading] = useState(true);
  const [produceQty, setProduceQty] = useState<Record<string, number>>({});
  const [producingId, setProducingId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const loadRecipes = useCallback(() => {
    void fetch("/api/recipes", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { recipes?: RecipeJson[] } | null) => {
        setRecipes(data?.recipes ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadRecipes();
  }, [loadRecipes]);

  async function produce(recipe: RecipeJson) {
    if (!recipe.outputProductId) {
      setErrors((e) => ({
        ...e,
        [recipe.id]: "Save the recipe first to create its inventory product.",
      }));
      return;
    }

    const qty = produceQty[recipe.id] ?? 1;
    setProducingId(recipe.id);
    setErrors((e) => ({ ...e, [recipe.id]: "" }));

    try {
      const res = await fetch("/api/production", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          finishedGoodId: recipe.outputProductId,
          quantity: qty,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
        shortages?: { name: string; need: number; have: number }[];
      };
      if (!res.ok) {
        const shortageHint =
          json.shortages?.length ?
            ` Short on: ${json.shortages.map((s) => s.name).join(", ")}.`
          : "";
        setErrors((e) => ({
          ...e,
          [recipe.id]: (json.error ?? "Production failed") + shortageHint,
        }));
        return;
      }
      loadRecipes();
      router.refresh();
    } finally {
      setProducingId(null);
    }
  }

  return (
    <div className="space-y-6">
      {loading ? (
        <RecipeListItemsSkeleton />
      ) : recipes.length === 0 ? (
        <section className="rounded-xl border border-dashed border-border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Create a recipe with a product name and ingredients. It appears in
            Inventory automatically — produce when ready, then invoice from stock.
          </p>
          <Link
            href="/recipes/new"
            className={cn(buttonVariants({ size: "sm" }), "mt-4 inline-flex gap-2")}
          >
            <Plus className="size-4" aria-hidden />
            Create your first recipe
          </Link>
        </section>
      ) : (
        <ul className="space-y-4">
          {recipes.map((recipe) => {
            const canProduce = recipe.stockStatus?.canProduceOne ?? false;
            const maxUnits = recipe.stockStatus?.maxProducible ?? 0;
            const ingredientCount = recipe.components?.length ?? 0;
            const missingOutputProduct = !recipe.outputProductId;
            const produceDisabled =
              producingId === recipe.id ||
              ingredientCount === 0 ||
              missingOutputProduct;

            return (
              <li
                key={recipe.id}
                className="rounded-xl border border-border bg-card p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{recipe.name}</p>
                      {!canProduce && ingredientCount > 0 ? (
                        <span
                          className="inline-flex items-center gap-1 rounded-md bg-warning/15 px-2 py-0.5 text-xs font-medium text-warning"
                          title={
                            recipe.stockStatus?.shortages
                              ?.map((s) => `${s.name}: need ${s.need}, have ${s.have}`)
                              .join("; ") ?? "Not enough raw materials"
                          }
                        >
                          <AlertTriangle className="size-3.5" aria-hidden />
                          Low materials
                        </span>
                      ) : null}
                      {recipe.outputStock > 0 ? (
                        <span className="rounded-md bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
                          In stock: {recipe.outputStock}
                        </span>
                      ) : (
                        <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                          Not in stock yet
                        </span>
                      )}
                    </div>
                    {recipe.description ? (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {recipe.description}
                      </p>
                    ) : null}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {ingredientCount} ingredient{ingredientCount === 1 ? "" : "s"}
                      {canProduce ?
                        ` · can produce up to ${maxUnits} now`
                      : ingredientCount > 0 ?
                        " · add raw materials to produce"
                      : " · add ingredients to formula"}
                      {recipe.outputProductId ? (
                        <>
                          {" "}
                          ·{" "}
                          <Link
                            href={`/inventory/${recipe.outputProductId}`}
                            className="underline underline-offset-2 hover:text-foreground"
                          >
                            View in inventory
                          </Link>
                        </>
                      ) : null}
                    </p>
                  </div>
                  <Link
                    href={`/recipes/${recipe.id}`}
                    className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-2")}
                  >
                    <Pencil className="size-4" aria-hidden />
                    Edit
                  </Link>
                </div>

                <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-border pt-4">
                  <div>
                    <label className="text-xs text-muted-foreground">Produce qty</label>
                    <NumberInput
                      min={0.01}
                      step="any"
                      value={produceQty[recipe.id] ?? 1}
                      emptyZero={false}
                      onChange={(e) =>
                        setProduceQty((q) => ({
                          ...q,
                          [recipe.id]: parseNumberInputValue(e.target.value) || 1,
                        }))
                      }
                      className="mt-1 h-9 w-28 rounded-lg border border-input bg-background px-3 text-sm tabular-nums"
                    />
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    disabled={produceDisabled}
                    title={
                      produceDisabled && producingId !== recipe.id
                        ? ingredientCount === 0
                          ? "Add ingredients to the formula first"
                          : missingOutputProduct
                            ? "Inventory product is not linked — refresh the page"
                            : undefined
                        : undefined
                    }
                    onClick={() => void produce(recipe)}
                  >
                    {producingId === recipe.id ? "Producing…" : "Produce"}
                  </Button>
                </div>

                {produceDisabled && producingId !== recipe.id ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    {ingredientCount === 0
                      ? "Add ingredients in Edit recipe before you can produce."
                      : missingOutputProduct
                        ? "Inventory product is not linked yet. Refresh the page or open Edit and save once."
                        : null}
                  </p>
                ) : null}

                {errors[recipe.id] ? (
                  <p className="mt-2 text-sm text-destructive" role="alert">
                    {errors[recipe.id]}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
