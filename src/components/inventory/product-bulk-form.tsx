"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { GST_RATES } from "@/lib/invoice-math";
import type { ProductJson } from "@/lib/product-json";
import { cn } from "@/lib/utils";
import { ChevronDown, Loader2, Plus, Search, Trash2 } from "lucide-react";

const gstRateSchema = z.union([
  z.literal(0),
  z.literal(5),
  z.literal(12),
  z.literal(18),
  z.literal(28),
]);

const rowSchema = z.object({
  name: z.string(),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  quantity: z.preprocess(
    (v) => (typeof v === "string" ? Number(v) : v),
    z.number().min(0),
  ),
  unitPrice: z.preprocess(
    (v) => (typeof v === "string" ? Number(v) : v),
    z.number().min(0),
  ),
  taxRate: z.preprocess(
    (v) => (typeof v === "string" ? Number(v) : v),
    gstRateSchema,
  ),
  isActive: z.boolean(),
});

const bulkSchema = z.object({
  rows: z.array(rowSchema).min(1),
});

type BulkFormValues = z.infer<typeof bulkSchema>;

type GstRateOption = (typeof GST_RATES)[number];

const fieldClass =
  "h-9 w-full min-w-0 rounded-md border border-input bg-background px-2 text-sm text-foreground shadow-sm transition-colors placeholder:text-muted-foreground/80 focus-visible:border-primary/50 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/15";

function emptyRow(): BulkFormValues["rows"][number] {
  return {
    name: "",
    sku: "",
    barcode: "",
    quantity: 0,
    unitPrice: 0,
    taxRate: 18,
    isActive: true,
  };
}

function pickGstRateFromProduct(p: ProductJson): GstRateOption {
  const n = Number(p.taxRate);
  return GST_RATES.includes(n as GstRateOption) ? (n as GstRateOption) : 18;
}

function rowFromCatalogProduct(p: ProductJson): BulkFormValues["rows"][number] {
  return {
    name: p.name,
    sku: p.sku ?? "",
    barcode: p.barcode ?? "",
    quantity: p.quantity,
    unitPrice: p.unitPrice,
    taxRate: pickGstRateFromProduct(p),
    isActive: p.isActive,
  };
}

function messageFromApiError(error: unknown, fallback: string) {
  if (typeof error === "string") return error;
  if (!error || typeof error !== "object") return fallback;
  for (const v of Object.values(error as Record<string, unknown>)) {
    if (Array.isArray(v) && typeof v[0] === "string") return v[0];
  }
  return fallback;
}

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

/** Search existing inventory and append a prefilled row to the draft table. */
function CatalogSearchForm({
  onAddRow,
  disabled,
}: {
  onAddRow: (row: BulkFormValues["rows"][number]) => void;
  disabled: boolean;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [hits, setHits] = useState<ProductJson[]>([]);

  useEffect(() => {
    const q = query.trim();
    const t = setTimeout(() => {
      if (q.length < 2) {
        setHits([]);
        return;
      }
      void fetch(`/api/products?q=${encodeURIComponent(q)}&limit=20`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data: { products?: ProductJson[] } | null) => {
          setHits(data?.products ?? []);
        })
        .catch(() => setHits([]));
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  function applyProduct(p: ProductJson) {
    onAddRow(rowFromCatalogProduct(p));
    setQuery("");
    setHits([]);
    setOpen(false);
  }

  return (
    <div className="space-y-3 px-4 py-4 sm:px-6">
      <div className="relative">
        <label
          htmlFor="catalog-search"
          className="text-xs font-medium text-muted-foreground"
        >
          Search by Name, SKU, or Barcode
        </label>
        <div className="relative mt-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            id="catalog-search"
            type="search"
            autoComplete="off"
            disabled={disabled}
            placeholder="Type 2+ characters, or scan barcode and press Enter…"
            className={cn(
              fieldClass,
              "h-10 pl-9 pr-3",
              disabled && "cursor-not-allowed opacity-60",
            )}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 200)}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              e.preventDefault();
              const code = (e.currentTarget as HTMLInputElement).value.trim();
              if (!code) return;
              void fetch(`/api/products/lookup?code=${encodeURIComponent(code)}`)
                .then((res) => (res.ok ? res.json() : null))
                .then((data: { product?: ProductJson } | null) => {
                  if (data?.product) applyProduct(data.product);
                });
            }}
          />
        </div>
        {open && hits.length > 0 ? (
          <ul
            className="absolute z-20 mt-1 max-h-52 w-full overflow-auto rounded-lg border border-border bg-popover py-1 text-sm shadow-md"
            role="listbox"
          >
            {hits.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  className="flex w-full flex-col px-3 py-2.5 text-left hover:bg-muted"
                  onMouseDown={(ev) => ev.preventDefault()}
                  onClick={() => applyProduct(p)}
                >
                  <span className="font-medium">{p.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {[p.sku && `SKU ${p.sku}`, p.barcode && `Barcode ${p.barcode}`]
                      .filter(Boolean)
                      .join(" · ")}{" "}
                    · {inr.format(p.unitPrice)} · Qty {Number(p.quantity)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      <p className="text-xs text-muted-foreground">
        Picking a product copies its details into the table below—you can still
        edit every cell. To add something not in the catalog yet, use{" "}
        <strong className="font-medium text-foreground">Add Empty Row</strong>.
      </p>
    </div>
  );
}

export function ProductBulkForm() {
  const router = useRouter();
  const [apiError, setApiError] = useState<string | null>(null);
  const form = useForm<BulkFormValues>({
    resolver: zodResolver(bulkSchema) as never,
    defaultValues: {
      rows: [emptyRow()],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "rows",
  });

  const busy = form.formState.isSubmitting;

  const onAddFromCatalog = useCallback(
    (row: BulkFormValues["rows"][number]) => {
      append(row);
    },
    [append],
  );

  async function onSubmit(values: BulkFormValues) {
    setApiError(null);
    const items = values.rows
      .filter((r) => r.name.trim().length > 0)
      .map((r) => ({
        name: r.name.trim(),
        sku: r.sku?.trim() || null,
        barcode: r.barcode?.trim() || null,
        description: null as string | null,
        quantity: r.quantity,
        unitPrice: r.unitPrice,
        taxRate: r.taxRate,
        isActive: r.isActive,
      }));

    if (items.length === 0) {
      setApiError("Add at least one product with a name.");
      return;
    }

    const res = await fetch("/api/products/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });

    const data = (await res.json()) as {
      error?: unknown;
      created?: number;
    };

    if (!res.ok) {
      setApiError(
        messageFromApiError(
          data.error,
          "Could not save products. Check for duplicate SKU/barcode.",
        ),
      );
      return;
    }

    router.push("/inventory");
    router.refresh();
  }

  const rowsWatch = form.watch("rows");
  const previewRows = rowsWatch.filter((r) => r.name.trim().length > 0);

  return (
    <div className="w-full space-y-8">
      <form
        onSubmit={form.handleSubmit((v) => onSubmit(v))}
        className="space-y-6"
        noValidate
      >
        {apiError ? (
          <div
            className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
            role="alert"
          >
            {apiError}
          </div>
        ) : null}

        {/* Separate card: search-only (does not submit the main form) */}
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <div className="border-b border-border bg-muted/40 px-4 py-4 sm:px-6">
            <h2 className="text-sm font-semibold tracking-tight">
              Find in Catalog
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Search your existing products and add them to the draft list.
              Values are copied; adjust quantities or prices in the table.
            </p>
          </div>
          <CatalogSearchForm onAddRow={onAddFromCatalog} disabled={busy} />
        </div>

        {/* Separate card: editable draft table */}
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <div className="border-b border-border bg-muted/40 px-4 py-4 sm:px-6">
            <h2 className="text-sm font-semibold tracking-tight">
              Products to Create
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Edit any field. Empty name rows are skipped when you save.
            </p>
          </div>

          <div className="overflow-x-auto p-2 sm:p-4">
            <table className="w-full min-w-[900px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs font-medium text-muted-foreground">
                  <th className="px-2 py-2">Product Name *</th>
                  <th className="px-2 py-2">SKU</th>
                  <th className="px-2 py-2">Barcode</th>
                  <th className="px-2 py-2 text-right">Quantity</th>
                  <th className="px-2 py-2 text-right">Unit Price (₹)</th>
                  <th className="px-2 py-2">GST (%)</th>
                  <th className="px-2 py-2 text-center">Active</th>
                  <th className="w-10 px-1 py-2" />
                </tr>
              </thead>
              <tbody>
                {fields.map((field, index) => (
                  <tr key={field.id} className="border-b border-border/70">
                    <td className="px-2 py-1.5 align-middle">
                      <input
                        type="text"
                        placeholder="Product Name"
                        className={cn(fieldClass, "min-w-[140px]")}
                        autoComplete="off"
                        {...form.register(`rows.${index}.name`)}
                      />
                    </td>
                    <td className="px-2 py-1.5 align-middle">
                      <input
                        type="text"
                        className={cn(fieldClass, "min-w-[72px]")}
                        autoComplete="off"
                        {...form.register(`rows.${index}.sku`)}
                      />
                    </td>
                    <td className="px-2 py-1.5 align-middle">
                      <input
                        type="text"
                        inputMode="numeric"
                        className={cn(fieldClass, "min-w-[88px]")}
                        autoComplete="off"
                        {...form.register(`rows.${index}.barcode`)}
                      />
                    </td>
                    <td className="px-2 py-1.5 align-middle">
                      <input
                        type="number"
                        min={0}
                        step="any"
                        className={cn(fieldClass, "text-right tabular-nums")}
                        {...form.register(`rows.${index}.quantity`)}
                      />
                    </td>
                    <td className="px-2 py-1.5 align-middle">
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        className={cn(fieldClass, "text-right tabular-nums")}
                        {...form.register(`rows.${index}.unitPrice`)}
                      />
                    </td>
                    <td className="px-2 py-1.5 align-middle">
                      <div className="relative">
                        <select
                          className={cn(
                            fieldClass,
                            "cursor-pointer appearance-none pr-7 tabular-nums",
                          )}
                          {...form.register(`rows.${index}.taxRate`, {
                            valueAsNumber: true,
                          })}
                        >
                          {GST_RATES.map((r) => (
                            <option key={r} value={r}>
                              {r}%
                            </option>
                          ))}
                        </select>
                        <ChevronDown
                          className="pointer-events-none absolute right-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
                          aria-hidden
                        />
                      </div>
                    </td>
                    <td className="px-2 py-1.5 text-center align-middle">
                      <input
                        type="checkbox"
                        className="size-4 rounded border-input accent-primary"
                        {...form.register(`rows.${index}.isActive`)}
                      />
                    </td>
                    <td className="px-1 py-1.5 align-middle">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        className="text-muted-foreground hover:text-destructive"
                        disabled={busy || fields.length <= 1}
                        onClick={() => remove(index)}
                        aria-label="Remove row"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-border bg-muted/20 px-4 py-3 sm:px-6">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => append(emptyRow())}
            >
              <Plus className="mr-1.5 size-4" aria-hidden />
              Add Empty Row
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="submit"
            disabled={busy || previewRows.length === 0}
            aria-busy={busy}
            className="gap-2"
          >
            {busy ? (
              <>
                <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
                Saving…
              </>
            ) : (
              `Save ${previewRows.length} product${previewRows.length === 1 ? "" : "s"}`
            )}
          </Button>
          <Link
            href="/inventory"
            className={cn(buttonVariants({ variant: "outline", size: "default" }))}
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
