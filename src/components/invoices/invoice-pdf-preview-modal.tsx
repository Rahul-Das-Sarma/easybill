"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";

import { InvoicePdfDocument } from "@/components/invoices/invoice-pdf-document";
import { Button } from "@/components/ui/button";
import type { InvoicePdfPayload } from "@/lib/invoice-pdf/types";
import { X } from "lucide-react";

const PDFViewer = dynamic(
  () => import("@react-pdf/renderer").then((mod) => mod.PDFViewer),
  {
    ssr: false,
    loading: () => (
      <p className="p-8 text-center text-sm text-muted-foreground">
        Loading PDF viewer…
      </p>
    ),
  },
);

export function InvoicePdfPreviewModal({
  invoiceId,
  open,
  onClose,
}: {
  invoiceId: string;
  open: boolean;
  onClose: () => void;
}) {
  const [data, setData] = useState<InvoicePdfPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/pdf-data`);
      const json = (await res.json()) as { error?: string } | InvoicePdfPayload;
      if (!res.ok) {
        setError(
          typeof (json as { error?: string }).error === "string"
            ? (json as { error: string }).error
            : "Could not load invoice",
        );
        setData(null);
        return;
      }
      setData(json as InvoicePdfPayload);
    } catch {
      setError("Network error");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [invoiceId]);

  useEffect(() => {
    if (open) {
      void load();
    } else {
      setData(null);
      setError(null);
    }
  }, [open, load]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Invoice PDF preview"
    >
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-border bg-card shadow-lg">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold">Preview</h2>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            aria-label="Close preview"
          >
            <X className="size-4" />
          </Button>
        </div>
        <div className="min-h-[420px] flex-1 overflow-auto bg-muted/30">
          {loading ? (
            <p className="p-8 text-center text-sm text-muted-foreground">
              Loading…
            </p>
          ) : error ? (
            <p className="p-8 text-center text-sm text-destructive">{error}</p>
          ) : data ? (
            <PDFViewer width="100%" height={560} showToolbar>
              <InvoicePdfDocument data={data} />
            </PDFViewer>
          ) : null}
        </div>
        <div className="border-t border-border px-4 py-2 text-xs text-muted-foreground">
          Download uses the server route (Puppeteer HTML → PDF, with React-PDF
          fallback) and uploads to Supabase when configured.
        </div>
      </div>
    </div>
  );
}
