"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export function InvoiceLifecycleActions({
  invoiceId,
  status,
  amountPaid,
}: {
  invoiceId: string;
  status: string;
  amountPaid: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<"issue" | "delete" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const paid = Number(amountPaid) > 0;
  const isDraft = status === "draft";

  if (!isDraft) {
    return null;
  }

  async function issueInvoice() {
    setError(null);
    setBusy("issue");
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/issue`, {
        method: "POST",
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(json.error ?? "Could not issue invoice.");
        return;
      }
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function deleteDraft() {
    if (
      !window.confirm(
        "Delete this draft invoice? This cannot be undone.",
      )
    ) {
      return;
    }
    setError(null);
    setBusy("delete");
    try {
      const res = await fetch(`/api/invoices/${invoiceId}`, {
        method: "DELETE",
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(json.error ?? "Could not delete invoice.");
        return;
      }
      router.push("/invoices");
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          disabled={busy !== null || paid}
          onClick={() => void issueInvoice()}
          className="gap-2"
        >
          {busy === "issue" ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Issuing…
            </>
          ) : (
            "Issue invoice"
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={busy !== null || paid}
          onClick={() => void deleteDraft()}
          className="gap-2 text-destructive hover:text-destructive"
        >
          {busy === "delete" ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Deleting…
            </>
          ) : (
            "Delete draft"
          )}
        </Button>
      </div>
      {error ? (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
