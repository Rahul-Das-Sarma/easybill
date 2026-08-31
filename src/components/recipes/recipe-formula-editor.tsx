"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

type RawHit = {
  id: string;
  name: string;
  sku: string | null;
  quantity: number;
};

export type FormulaLine = {
  rawMaterialId: string;
  name: string;
  sku: string | null;
  quantityPerUnit: number;
  stock: number;
};

export function RecipeFormulaEditor({
  lines,
  onChange,
}: {
  lines: FormulaLine[];
  onChange: (lines: FormulaLine[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<RawHit[]>([]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setHits([]);
      return;
    }
    const t = setTimeout(() => {
      void fetch(
        `/api/products?q=${encodeURIComponent(q)}&kind=raw_material&limit=15`,
      )
        .then((res) => (res.ok ? res.json() : null))
        .then((data: { products?: RawHit[] } | null) => {
          setHits(data?.products ?? []);
        })
        .catch(() => setHits([]));
    }, 200);
    return () => clearTimeout(t);
  }, [query]);

  function addMaterial(p: RawHit) {
    if (lines.some((l) => l.rawMaterialId === p.id)) return;
    onChange([
      ...lines,
      {
        rawMaterialId: p.id,
        name: p.name,
        sku: p.sku,
        quantityPerUnit: 1,
        stock: p.quantity,
      },
    ]);
    setQuery("");
    setHits([]);
  }

  return (
    <div>
      <div className="relative">
        <label className="text-xs text-muted-foreground">Add ingredient</label>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search raw materials…"
          className="mt-1 h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
        />
        {hits.length > 0 ? (
          <ul className="absolute z-10 mt-1 max-h-40 w-full overflow-auto rounded-lg border border-border bg-popover py-1 text-sm shadow-md">
            {hits.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  className="flex w-full px-3 py-2 text-left hover:bg-muted"
                  onClick={() => addMaterial(p)}
                >
                  <span className="font-medium">{p.name}</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    Stock {p.quantity}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {lines.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          No ingredients yet. Add raw materials that this formula needs per 1 unit
          of output.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-border">
          {lines.map((line) => (
            <li
              key={line.rawMaterialId}
              className="flex flex-wrap items-center gap-3 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{line.name}</p>
                <p className="text-xs text-muted-foreground">
                  {line.sku ? `SKU ${line.sku} · ` : ""}On hand {line.stock}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-muted-foreground">Qty / unit</label>
                <input
                  type="number"
                  min={0.0001}
                  step="any"
                  value={line.quantityPerUnit}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    onChange(
                      lines.map((l) =>
                        l.rawMaterialId === line.rawMaterialId
                          ? { ...l, quantityPerUnit: n }
                          : l,
                      ),
                    );
                  }}
                  className="h-9 w-24 rounded-lg border border-input bg-background px-2 text-sm tabular-nums"
                />
                <Button
                  type="button"
                  size="icon-xs"
                  variant="ghost"
                  aria-label="Remove"
                  onClick={() =>
                    onChange(
                      lines.filter((l) => l.rawMaterialId !== line.rawMaterialId),
                    )
                  }
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
