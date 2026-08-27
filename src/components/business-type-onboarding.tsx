"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Factory, Store } from "lucide-react";
import { cn } from "@/lib/utils";

type Choice = "trading" | "manufacturer";

/**
 * One-time prompt until the user picks trading vs manufacturer.
 */
export function BusinessTypeOnboarding() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [choice, setChoice] = useState<Choice>("trading");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/me")
      .then((res) => (res.ok ? res.json() : null))
      .then(
        (data: { businessTypeChosen?: boolean; businessType?: Choice } | null) => {
          if (cancelled || !data) return;
          if (!data.businessTypeChosen) {
            setChoice(data.businessType === "manufacturer" ? "manufacturer" : "trading");
            setOpen(true);
          }
        },
      )
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessType: choice }),
      });
      if (!res.ok) {
        setError("Could not save. Try again.");
        return;
      }
      setOpen(false);
      window.dispatchEvent(new Event("easybill:business-type"));
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="business-type-title"
    >
      <div className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-lg">
        <h2 id="business-type-title" className="text-lg font-semibold">
          How do you run your business?
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          This unlocks the right tools. You can change it later in Settings.
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setChoice("trading")}
            className={cn(
              "flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-colors",
              choice === "trading"
                ? "border-brand-500 bg-brand-50"
                : "border-border hover:bg-muted/50",
            )}
          >
            <Store className="size-5 text-brand-700" aria-hidden />
            <span className="text-sm font-semibold">Trading / retail</span>
            <span className="text-xs text-muted-foreground">
              Buy and sell finished products. Simple stock and invoices.
            </span>
          </button>
          <button
            type="button"
            onClick={() => setChoice("manufacturer")}
            className={cn(
              "flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-colors",
              choice === "manufacturer"
                ? "border-brand-500 bg-brand-50"
                : "border-border hover:bg-muted/50",
            )}
          >
            <Factory className="size-5 text-brand-700" aria-hidden />
            <span className="text-sm font-semibold">Manufacturer</span>
            <span className="text-xs text-muted-foreground">
              Raw materials, bill of materials, and production into finished goods.
            </span>
          </button>
        </div>

        {error ? (
          <p className="mt-3 text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        <div className="mt-6 flex justify-end">
          <Button type="button" onClick={() => void save()} disabled={saving}>
            {saving ? "Saving…" : "Continue"}
          </Button>
        </div>
      </div>
    </div>
  );
}
