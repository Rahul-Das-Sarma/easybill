"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { AssignedRecipePreview } from "@/components/recipes/assigned-recipe-preview";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

type FgOption = {
  id: string;
  name: string;
  sku: string | null;
  quantity: number;
};

type RawMaterial = {
  id: string;
  name: string;
  sku: string | null;
  quantity: number;
  unitPrice: number;
};

type RunRow = {
  id: string;
  quantity: number;
  createdAt: string;
  notes: string | null;
  finishedGood: { id: string; name: string; sku: string | null };
};

export function ProductionPanel() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<FgOption[]>([]);
  const [selected, setSelected] = useState<FgOption | null>(null);
  const [qty, setQty] = useState(1);
  const [notes, setNotes] = useState("");
  const [runs, setRuns] = useState<RunRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [shortages, setShortages] = useState<
    { name: string; need: number; have: number }[] | null
  >(null);
  const [submitting, setSubmitting] = useState(false);

  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [rmName, setRmName] = useState("");
  const [rmQty, setRmQty] = useState(0);
  const [rmSku, setRmSku] = useState("");
  const [rmPrice, setRmPrice] = useState(0);
  const [rmSaving, setRmSaving] = useState(false);
  const [rmError, setRmError] = useState<string | null>(null);
  const [rmMessage, setRmMessage] = useState<string | null>(null);

  function loadRuns() {
    void fetch("/api/production")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { runs?: RunRow[] } | null) => {
        setRuns(data?.runs ?? []);
      });
  }

  function loadRawMaterials() {
    void fetch("/api/products?kind=raw_material&limit=100")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { products?: RawMaterial[] } | null) => {
        setRawMaterials(data?.products ?? []);
      });
  }

  useEffect(() => {
    loadRuns();
    loadRawMaterials();
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setHits([]);
      return;
    }
    const t = setTimeout(() => {
      void fetch(
        `/api/products?q=${encodeURIComponent(q)}&kind=finished_good&limit=15`,
      )
        .then((res) => (res.ok ? res.json() : null))
        .then((data: { products?: FgOption[] } | null) => {
          setHits(data?.products ?? []);
        });
    }, 200);
    return () => clearTimeout(t);
  }, [query]);

  async function addRawMaterial() {
    const name = rmName.trim();
    if (!name) {
      setRmError("Enter a raw material name.");
      return;
    }
    setRmSaving(true);
    setRmError(null);
    setRmMessage(null);
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          sku: rmSku.trim() || null,
          kind: "raw_material",
          quantity: Math.max(0, Number(rmQty) || 0),
          unitPrice: Math.max(0, Number(rmPrice) || 0),
          taxRate: 18,
          isActive: true,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        error?: string | Record<string, string[]>;
        product?: RawMaterial;
      };
      if (!res.ok) {
        const err = json.error;
        setRmError(
          typeof err === "string"
            ? err
            : "Could not add raw material. Check for duplicate SKU.",
        );
        return;
      }
      setRmName("");
      setRmQty(0);
      setRmSku("");
      setRmPrice(0);
      setRmMessage("Raw material added to inventory.");
      loadRawMaterials();
      router.refresh();
    } finally {
      setRmSaving(false);
    }
  }

  async function produce() {
    if (!selected) {
      setError("Select a finished good.");
      return;
    }
    setSubmitting(true);
    setError(null);
    setShortages(null);
    try {
      const res = await fetch("/api/production", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          finishedGoodId: selected.id,
          quantity: qty,
          notes: notes.trim() || null,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
        shortages?: { name: string; need: number; have: number }[];
      };
      if (!res.ok) {
        setError(json.error ?? "Production failed");
        setShortages(json.shortages ?? null);
        return;
      }
      setNotes("");
      setQty(1);
      loadRuns();
      loadRawMaterials();
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-medium">Raw materials</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Same inventory stock used in bill of materials and production.
            </p>
          </div>
          <Link
            href="/inventory?kind=raw_material"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Open in Inventory
          </Link>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2 lg:col-span-1">
            <label className="text-xs text-muted-foreground">Name</label>
            <input
              type="text"
              value={rmName}
              onChange={(e) => setRmName(e.target.value)}
              placeholder="e.g. Cotton yarn"
              className="mt-1 h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">On hand</label>
            <input
              type="number"
              min={0}
              step="any"
              value={rmQty}
              onChange={(e) => setRmQty(Number(e.target.value))}
              className="mt-1 h-9 w-full rounded-lg border border-input bg-background px-3 text-sm tabular-nums"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Unit price (₹)</label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={rmPrice}
              onChange={(e) => setRmPrice(Number(e.target.value))}
              className="mt-1 h-9 w-full rounded-lg border border-input bg-background px-3 text-sm tabular-nums"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">SKU (optional)</label>
            <input
              type="text"
              value={rmSku}
              onChange={(e) => setRmSku(e.target.value)}
              className="mt-1 h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
            />
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button
            type="button"
            size="sm"
            disabled={rmSaving}
            onClick={() => void addRawMaterial()}
          >
            {rmSaving ? "Adding…" : "Add raw material"}
          </Button>
          {rmError ? (
            <p className="text-sm text-destructive" role="alert">
              {rmError}
            </p>
          ) : null}
          {rmMessage ? (
            <p className="text-sm text-muted-foreground">{rmMessage}</p>
          ) : null}
        </div>

        {rawMaterials.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            No raw materials yet. Add one above, or create them in Inventory.
          </p>
        ) : (
          <ul className="mt-4 max-h-56 divide-y divide-border overflow-auto rounded-lg border border-border text-sm">
            {rawMaterials.map((rm) => (
              <li
                key={rm.id}
                className="flex flex-wrap items-baseline justify-between gap-2 px-3 py-2"
              >
                <div className="min-w-0">
                  <Link
                    href={`/inventory/${rm.id}`}
                    className="font-medium hover:underline"
                  >
                    {rm.name}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {rm.sku ? `SKU ${rm.sku} · ` : ""}₹{rm.unitPrice}
                  </p>
                </div>
                <p className="tabular-nums text-muted-foreground">
                  Stock {rm.quantity}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h2 className="text-sm font-medium">Produce finished goods</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Select a finished good with an assigned recipe, then produce. Production
          uses the saved formula and consumes raw materials automatically.
        </p>

        <div className="relative mt-4 max-w-xl">
          <label className="text-xs text-muted-foreground">Finished good</label>
          <div className="relative mt-1">
            <input
              type="search"
              value={selected ? selected.name : query}
              onChange={(e) => {
                setSelected(null);
                setQuery(e.target.value);
              }}
              placeholder="Search finished goods…"
              className="h-9 w-full rounded-lg border border-input bg-background px-3 pr-9 text-sm"
            />
            {selected ? (
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Clear selection"
                onClick={() => {
                  setSelected(null);
                  setQuery("");
                }}
              >
                <X className="size-4" />
              </button>
            ) : null}
          </div>
          {!selected && hits.length > 0 ? (
            <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-border bg-popover py-1 text-sm shadow-md">
              {hits.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    className="flex w-full flex-col px-3 py-2 text-left hover:bg-muted"
                    onClick={() => {
                      setSelected(p);
                      setQuery("");
                      setHits([]);
                    }}
                  >
                    <span className="font-medium">{p.name}</span>
                    <span className="text-xs text-muted-foreground">
                      Stock {p.quantity}
                      {p.sku ? ` · SKU ${p.sku}` : ""}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        {selected ? (
          <div className="mt-4">
            <AssignedRecipePreview
              key={selected.id}
              productId={selected.id}
              productName={selected.name}
            />
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            Search and select a finished good to view its assigned recipe.
          </p>
        )}

        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div>
            <label className="text-xs text-muted-foreground">Quantity to produce</label>
            <input
              type="number"
              min={0.01}
              step="any"
              value={qty}
              onChange={(e) => setQty(Number(e.target.value))}
              className="mt-1 h-9 w-32 rounded-lg border border-input bg-background px-3 text-sm tabular-nums"
            />
          </div>
          <div className="min-w-[200px] flex-1">
            <label className="text-xs text-muted-foreground">Notes (optional)</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1 h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
            />
          </div>
          <Button
            type="button"
            size="sm"
            disabled={submitting || !selected}
            onClick={() => void produce()}
          >
            {submitting ? "Producing…" : "Produce"}
          </Button>
        </div>

        {error ? (
          <p className="mt-3 text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        {shortages && shortages.length > 0 ? (
          <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
            {shortages.map((s) => (
              <li key={s.name}>
                {s.name}: need {s.need}, have {s.have}
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h2 className="text-sm font-medium">Recent production</h2>
        {runs.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No production runs yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border text-sm">
            {runs.map((r) => (
              <li key={r.id} className="flex flex-wrap items-baseline justify-between gap-2 py-2">
                <div>
                  <p className="font-medium">{r.finishedGood.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(r.createdAt).toLocaleString("en-IN")}
                    {r.notes ? ` · ${r.notes}` : ""}
                  </p>
                </div>
                <p className="tabular-nums">+{r.quantity}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
