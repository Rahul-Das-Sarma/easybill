"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { formatInr } from "@/lib/format-inr";
import { GST_RATES } from "@/lib/invoice-math";
import { lineFromProduct } from "@/lib/invoice-line-from-product";
import type { InvoiceCreateFormValues } from "@/lib/invoice-create-form-schema";
import type { ProductJson } from "@/lib/product-json";
import { cn } from "@/lib/utils";
import { Plus, Search } from "lucide-react";

type GstRateOption = (typeof GST_RATES)[number];

export type InvoiceLineAppend = InvoiceCreateFormValues["lines"][number];

type Props = {
  onAppendLine: (line: InvoiceLineAppend) => void;
  disabled: boolean;
};

export function InvoiceAddProductsPanel({ onAppendLine, disabled }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [hits, setHits] = useState<ProductJson[]>([]);
  const [customName, setCustomName] = useState("");
  const [customQty, setCustomQty] = useState(1);
  const [customPrice, setCustomPrice] = useState(0);
  const [customTax, setCustomTax] = useState<GstRateOption>(18);
  const [customError, setCustomError] = useState<string | null>(null);
  const [addTab, setAddTab] = useState<"inventory" | "custom">("inventory");

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

  function applyCatalogProduct(p: ProductJson) {
    onAppendLine(lineFromProduct(p));
    setQuery("");
    setHits([]);
    setOpen(false);
  }

  function addCustomLine() {
    setCustomError(null);
    const name = customName.trim();
    if (!name) {
      setCustomError("Enter a product name.");
      return;
    }
    onAppendLine({
      productName: name,
      quantity: Math.max(0.01, Number(customQty) || 1),
      unitPrice: Math.max(0, Number(customPrice) || 0),
      taxRate: customTax,
    });
    setCustomName("");
    setCustomQty(1);
    setCustomPrice(0);
    setCustomTax(18);
  }

  return (
    <div className="w-full">
      <div
        role="tablist"
        aria-label="How to add a line"
        className="flex gap-1 border-b border-border"
      >
        <button
          type="button"
          role="tab"
          id="invoice-add-tab-inventory"
          aria-selected={addTab === "inventory"}
          aria-controls="invoice-add-panel-inventory"
          tabIndex={addTab === "inventory" ? 0 : -1}
          className={cn(
            "-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors",
            addTab === "inventory"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
          onClick={() => setAddTab("inventory")}
        >
          From inventory
        </button>
        <button
          type="button"
          role="tab"
          id="invoice-add-tab-custom"
          aria-selected={addTab === "custom"}
          aria-controls="invoice-add-panel-custom"
          tabIndex={addTab === "custom" ? 0 : -1}
          className={cn(
            "-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors",
            addTab === "custom"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
          onClick={() => setAddTab("custom")}
        >
          Not in inventory
        </button>
      </div>

      <div
        id="invoice-add-panel-inventory"
        role="tabpanel"
        aria-labelledby="invoice-add-tab-inventory"
        hidden={addTab !== "inventory"}
        className="pt-4"
      >
        <div className="relative">
          <label htmlFor="invoice-product-search" className="sr-only">
            Search inventory
          </label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <input
              id="invoice-product-search"
              type="search"
              autoComplete="off"
              disabled={disabled}
              placeholder="Search by name… (Enter for barcode / SKU)"
              className={cn(
                "h-9 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm outline-none ring-ring focus-visible:ring-2",
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
                    if (data?.product) applyCatalogProduct(data.product);
                  });
              }}
            />
          </div>
          {open && hits.length > 0 ? (
            <ul
              className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-border bg-popover py-1 text-sm shadow-md"
              role="listbox"
            >
              {hits.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    className="flex w-full flex-col px-3 py-2 text-left hover:bg-muted"
                    onMouseDown={(ev) => ev.preventDefault()}
                    onClick={() => applyCatalogProduct(p)}
                  >
                    <span className="font-medium">{p.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {[p.sku && `SKU ${p.sku}`, p.barcode && `${p.barcode}`]
                        .filter(Boolean)
                        .join(" · ")}{" "}
                      · {formatInr.format(p.unitPrice)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>

      <div
        id="invoice-add-panel-custom"
        role="tabpanel"
        aria-labelledby="invoice-add-tab-custom"
        hidden={addTab !== "custom"}
        className="pt-4"
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
          <input
            type="text"
            autoComplete="off"
            disabled={disabled}
            aria-label="Product name"
            className="h-9 min-w-[140px] flex-1 rounded-lg border border-input bg-background px-3 text-sm sm:min-w-[200px]"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            placeholder="Product name"
          />
          <input
            type="number"
            min={0.01}
            step="0.01"
            disabled={disabled}
            title="Quantity"
            className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm tabular-nums sm:w-20"
            value={customQty}
            onChange={(e) => setCustomQty(Number(e.target.value))}
          />
          <input
            type="number"
            min={0}
            step="0.01"
            disabled={disabled}
            title="Unit price ₹"
            className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm tabular-nums sm:w-24"
            value={customPrice}
            onChange={(e) => setCustomPrice(Number(e.target.value))}
          />
          <select
            className="h-9 w-full rounded-lg border border-input bg-background px-2 text-sm sm:w-18"
            disabled={disabled}
            title="GST %"
            value={customTax}
            onChange={(e) =>
              setCustomTax(Number(e.target.value) as GstRateOption)
            }
          >
            {GST_RATES.map((r) => (
              <option key={r} value={r}>
                {r}%
              </option>
            ))}
          </select>
          <Button
            type="button"
            size="sm"
            className="sm:shrink-0"
            disabled={disabled}
            onClick={() => addCustomLine()}
          >
            <Plus className="mr-1 size-4" aria-hidden />
            Add
          </Button>
        </div>
        {customError ? (
          <p className="mt-1.5 text-xs text-destructive">{customError}</p>
        ) : null}
      </div>
    </div>
  );
}
