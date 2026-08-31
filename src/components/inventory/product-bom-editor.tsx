"use client";

import { useEffect, useState } from "react";

import { BomEditorContentSkeleton } from "@/components/ui/content-skeletons";
import { Button } from "@/components/ui/button";
import { NumberInput } from "@/components/ui/number-input";
import { parseNumberInputValue } from "@/lib/number-input";
import { Trash2 } from "lucide-react";

type RawHit = {
  id: string;
  name: string;
  sku: string | null;
  quantity: number;
};

type BomLine = {
  rawMaterialId: string;
  name: string;
  sku: string | null;
  quantityPerUnit: number;
  stock: number;
};

export function ProductBomEditor({
  finishedGoodId,
  title = "Bill of materials",
  description = "Raw materials consumed to make one unit of this finished good.",
}: {
  finishedGoodId: string;
  title?: string;
  description?: string;
}) {
  const [lines, setLines] = useState<BomLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<RawHit[]>([]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void fetch(`/api/products/${finishedGoodId}/bom`)
      .then((res) => (res.ok ? res.json() : null))
      .then(
        (data: {
          components?: {
            rawMaterialId: string;
            quantityPerUnit: number;
            rawMaterial: {
              name: string;
              sku: string | null;
              quantity: number;
            };
          }[];
        } | null) => {
          if (cancelled || !data?.components) return;
          setLines(
            data.components.map((c) => ({
              rawMaterialId: c.rawMaterialId,
              name: c.rawMaterial.name,
              sku: c.rawMaterial.sku,
              quantityPerUnit: c.quantityPerUnit,
              stock: c.rawMaterial.quantity,
            })),
          );
        },
      )
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [finishedGoodId]);

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
    setLines((prev) => {
      if (prev.some((l) => l.rawMaterialId === p.id)) return prev;
      return [
        ...prev,
        {
          rawMaterialId: p.id,
          name: p.name,
          sku: p.sku,
          quantityPerUnit: 1,
          stock: p.quantity,
        },
      ];
    });
    setQuery("");
    setHits([]);
  }

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/products/${finishedGoodId}/bom`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          components: lines.map((l) => ({
            rawMaterialId: l.rawMaterialId,
            quantityPerUnit: l.quantityPerUnit,
          })),
        }),
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        setMessage(json.error ?? "Could not save BOM");
        return;
      }
      setMessage("Bill of materials saved.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h2 className="text-sm font-medium">{title}</h2>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        <BomEditorContentSkeleton />
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <h2 className="text-sm font-medium">{title}</h2>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>

      <div className="relative mt-4">
        <label className="text-xs text-muted-foreground">Add raw material</label>
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
          No components yet. Add raw materials above.
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
                <NumberInput
                  min={0.0001}
                  step="any"
                  value={line.quantityPerUnit}
                  emptyZero={false}
                  onChange={(e) => {
                    const n = parseNumberInputValue(e.target.value);
                    setLines((prev) =>
                      prev.map((l) =>
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
                    setLines((prev) =>
                      prev.filter((l) => l.rawMaterialId !== line.rawMaterialId),
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

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button type="button" size="sm" onClick={() => void save()} disabled={saving}>
          {saving ? "Saving…" : "Save BOM"}
        </Button>
        {message ? (
          <p className="text-sm text-muted-foreground">{message}</p>
        ) : null}
      </div>
    </section>
  );
}
