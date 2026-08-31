"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import {
  RecipeFormulaEditor,
  type FormulaLine,
} from "@/components/recipes/recipe-formula-editor";
import {
  FormulaLinesSkeleton,
  RecipeFormFieldsSkeleton,
} from "@/components/ui/content-skeletons";
import { Button } from "@/components/ui/button";
import { NumberInput } from "@/components/ui/number-input";
import { buttonVariants } from "@/components/ui/button-variants";
import { GST_RATES } from "@/lib/invoice-math";
import { parseNumberInputValue } from "@/lib/number-input";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

type RecipePayload = {
  id?: string;
  name: string;
  description: string | null;
  unitPrice?: number;
  taxRate?: number;
  components?: {
    rawMaterialId: string;
    quantityPerUnit: number;
    rawMaterial: {
      name: string;
      sku: string | null;
      quantity: number;
    };
  }[];
};

export function RecipeForm({
  mode,
  recipeId,
}: {
  mode: "create" | "edit";
  recipeId?: string;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [unitPrice, setUnitPrice] = useState(0);
  const [taxRate, setTaxRate] = useState<(typeof GST_RATES)[number]>(18);
  const [lines, setLines] = useState<FormulaLine[]>([]);
  const [loading, setLoading] = useState(mode === "edit");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (mode !== "edit" || !recipeId) return;
    let cancelled = false;
    setLoading(true);
    void fetch(`/api/recipes/${recipeId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { recipe?: RecipePayload } | null) => {
        if (cancelled || !data?.recipe) return;
        setName(data.recipe.name);
        setDescription(data.recipe.description ?? "");
        setUnitPrice(data.recipe.unitPrice ?? 0);
        setTaxRate((data.recipe.taxRate ?? 18) as (typeof GST_RATES)[number]);
        setLines(
          (data.recipe.components ?? []).map((c) => ({
            rawMaterialId: c.rawMaterialId,
            name: c.rawMaterial.name,
            sku: c.rawMaterial.sku,
            quantityPerUnit: c.quantityPerUnit,
            stock: c.rawMaterial.quantity,
          })),
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [mode, recipeId]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Recipe name is required.");
      return;
    }
    if (lines.some((l) => l.quantityPerUnit <= 0)) {
      setError("Every ingredient needs a quantity greater than 0.");
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const payload = {
        name: trimmed,
        description: description.trim() || null,
        unitPrice,
        taxRate,
        components: lines.map((l) => ({
          rawMaterialId: l.rawMaterialId,
          quantityPerUnit: l.quantityPerUnit,
        })),
      };

      const res = await fetch(
        mode === "create" ? "/api/recipes" : `/api/recipes/${recipeId}`,
        {
          method: mode === "create" ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(json.error ?? "Could not save recipe");
        return;
      }

      if (mode === "create") {
        router.push("/recipes");
        router.refresh();
        return;
      }
      setMessage("Recipe saved.");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h2 className="text-sm font-medium">Product & pricing</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            This name appears in Inventory and on invoices. Saving creates or updates
            the inventory product automatically.
          </p>
          <RecipeFormFieldsSkeleton />
        </section>
        <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h2 className="text-sm font-medium">Formula (ingredients)</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Raw materials per 1 unit. Produce from the Recipes list when stock allows.
          </p>
          <FormulaLinesSkeleton />
        </section>
      </div>
    );
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="space-y-6">
      <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h2 className="text-sm font-medium">Product & pricing</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          This name appears in Inventory and on invoices. Saving creates or updates
          the inventory product automatically.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="text-xs text-muted-foreground">Product name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Blue cotton shirt"
              required
              className="mt-1 h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Unit price (₹)</label>
            <NumberInput
              min={0}
              step="0.01"
              value={unitPrice}
              onChange={(e) => setUnitPrice(parseNumberInputValue(e.target.value))}
              className="mt-1 h-9 w-full rounded-lg border border-input bg-background px-3 text-sm tabular-nums"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">GST (%)</label>
            <select
              value={taxRate}
              onChange={(e) =>
                setTaxRate(Number(e.target.value) as (typeof GST_RATES)[number])
              }
              className="mt-1 h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
            >
              {GST_RATES.map((r) => (
                <option key={r} value={r}>
                  {r}%
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs text-muted-foreground">
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h2 className="text-sm font-medium">Formula (ingredients)</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Raw materials per 1 unit. Produce from the Recipes list when stock allows.
        </p>
        <div className="mt-4">
          <RecipeFormulaEditor lines={lines} onChange={setLines} />
        </div>
      </section>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="text-sm text-muted-foreground" role="status">
          {message}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
              Saving…
            </>
          ) : mode === "create" ? (
            "Create recipe"
          ) : (
            "Save recipe"
          )}
        </Button>
        <Link href="/recipes" className={cn(buttonVariants({ variant: "outline" }))}>
          Cancel
        </Link>
      </div>
    </form>
  );
}
