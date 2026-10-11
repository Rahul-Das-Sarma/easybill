"use client";

import { useState } from "react";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";

export default function ReturnsPage() {
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [month, setMonth] = useState(defaultMonth);
  const [summary, setSummary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function prepare() {
    setBusy(true);
    setError(null);
    setSummary(null);
    try {
      const res = await fetch(`/api/returns/gstr1?month=${month}`);
      const json = (await res.json()) as {
        error?: string;
        invoiceCount?: number;
        b2bCount?: number;
        payload?: unknown;
      };
      if (!res.ok || !json.payload) {
        setError(json.error ?? "Could not prepare GSTR-1.");
        return;
      }
      setSummary(
        `${json.invoiceCount ?? 0} issued invoices, ${json.b2bCount ?? 0} B2B. Upload this file in the GST portal offline tool.`,
      );
      const blob = new Blob([JSON.stringify(json.payload, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `gstr1-${month}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        title="GST returns"
        description="Prepare GSTR-1 from issued invoices. Upload the JSON on the GST portal to file."
      />
      <ol className="mb-6 grid max-w-3xl gap-3 sm:grid-cols-3">
        {[
          "Issue this month’s invoices. Drafts are left out.",
          "Download the GSTR-1 file here.",
          "Upload it on the GST portal, then submit the return.",
        ].map((step, index) => (
          <li
            key={step}
            className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground"
          >
            <span className="mb-1 block text-xs font-medium text-foreground">
              Step {index + 1}
            </span>
            {step}
          </li>
        ))}
      </ol>
      <section className="max-w-xl rounded-xl border border-border bg-card p-6 shadow-sm">
        <label htmlFor="return-month" className="text-sm font-medium">
          Return month
        </label>
        <input
          id="return-month"
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="mt-2 h-10 rounded-lg border border-input bg-background px-3 text-sm"
        />
        <div className="mt-4">
          <Button type="button" disabled={busy} onClick={() => void prepare()}>
            {busy ? "Preparing…" : "Download GSTR-1 JSON"}
          </Button>
        </div>
        {summary ? (
          <p className="mt-3 text-sm text-muted-foreground">{summary}</p>
        ) : null}
        {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
      </section>
    </>
  );
}
