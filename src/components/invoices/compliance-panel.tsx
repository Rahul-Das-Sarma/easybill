"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";

export function CompliancePanel({
  invoiceId,
  irn,
  irnAckNo,
  ewayBillNo,
  canGenerate,
}: {
  invoiceId: string;
  irn: string | null;
  irnAckNo: string | null;
  ewayBillNo: string | null;
  canGenerate: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"irn" | "eway" | null>(null);
  const [distanceKm, setDistanceKm] = useState("100");
  const [vehicleNo, setVehicleNo] = useState("");

  async function generateIrn() {
    setBusy("irn");
    setError(null);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/irn`, { method: "POST" });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(json.error ?? "Could not generate IRN.");
        return;
      }
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function generateEway() {
    setBusy("eway");
    setError(null);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/eway`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          distanceKm: Number(distanceKm),
          vehicleNo,
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(json.error ?? "Could not generate the e-way bill.");
        return;
      }
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <h2 className="text-sm font-medium">Government invoice number</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Generate the IRN after the invoice is issued. Add the e-way bill only
        when the goods are being transported. You need a buyer GSTIN, PIN codes,
        and an HSN on every line.
      </p>
      {irn ? (
        <dl className="mt-3 space-y-1 text-sm">
          <div>
            <dt className="text-xs text-muted-foreground">IRN</dt>
            <dd className="break-all font-mono text-xs">{irn}</dd>
          </div>
          {irnAckNo ? (
            <div className="text-xs text-muted-foreground">Ack {irnAckNo}</div>
          ) : null}
        </dl>
      ) : (
        <Button
          type="button"
          size="sm"
          className="mt-3"
          disabled={!canGenerate || busy !== null}
          onClick={() => void generateIrn()}
        >
          {busy === "irn" ? "Generating…" : "Generate IRN"}
        </Button>
      )}
      {ewayBillNo ? (
        <p className="mt-3 text-sm">
          E-way bill <span className="font-medium">{ewayBillNo}</span>
        </p>
      ) : irn ? (
        <div className="mt-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <input
              aria-label="Distance in km"
              value={distanceKm}
              onChange={(e) => setDistanceKm(e.target.value)}
              className="h-9 rounded-lg border border-input bg-background px-2 text-sm"
            />
            <input
              aria-label="Vehicle number"
              value={vehicleNo}
              onChange={(e) => setVehicleNo(e.target.value)}
              placeholder="MH01AB1234"
              className="h-9 rounded-lg border border-input bg-background px-2 text-sm uppercase"
            />
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busy !== null || vehicleNo.trim().length < 4}
            onClick={() => void generateEway()}
          >
            {busy === "eway" ? "Generating…" : "Generate e-way bill"}
          </Button>
        </div>
      ) : null}
      {!canGenerate && !irn ? (
        <p className="mt-2 text-xs text-muted-foreground">
          Issue the invoice first.
        </p>
      ) : null}
      {error ? <p className="mt-2 text-xs text-destructive">{error}</p> : null}
    </section>
  );
}
