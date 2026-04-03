"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { paymentMethodLabel } from "@/lib/invoice-payment-status";
import { Loader2 } from "lucide-react";

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

const METHOD_OPTIONS = [
  { value: "upi", label: "UPI" },
  { value: "cash", label: "Cash" },
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "card", label: "Card" },
  { value: "cheque", label: "Cheque" },
  { value: "other", label: "Other" },
] as const;

const formSchema = z.object({
  amount: z.string().min(1, "Enter amount"),
  paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date"),
  method: z.enum([
    "cash",
    "upi",
    "bank_transfer",
    "card",
    "cheque",
    "other",
  ]),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export type InvoicePaymentRow = {
  id: string;
  amount: string;
  paymentDate: string;
  method: string;
  reference: string | null;
  notes: string | null;
  createdAt: string;
};

export function InvoicePaymentsPanel({
  invoiceId,
  totalAmount,
  amountPaid,
  status,
  payments,
}: {
  invoiceId: string;
  totalAmount: string;
  amountPaid: string;
  status: string;
  payments: InvoicePaymentRow[];
}) {
  const router = useRouter();
  const [markBusy, setMarkBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const outstanding = useMemo(() => {
    const t = Number(totalAmount);
    const p = Number(amountPaid);
    return Math.max(0, Math.round((t - p) * 100) / 100);
  }, [totalAmount, amountPaid]);

  const isPaid = status === "paid";

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: outstanding > 0 ? String(outstanding) : "",
      paymentDate: new Date().toISOString().slice(0, 10),
      method: "upi",
      reference: "",
      notes: "",
    },
  });

  async function onSubmit(values: FormValues) {
    setFormError(null);
    const amt = Number.parseFloat(values.amount.replace(/,/g, ""));
    if (!Number.isFinite(amt) || amt <= 0) {
      setFormError("Enter a valid positive amount");
      return;
    }
    if (amt - outstanding > 0.001) {
      setFormError(`Maximum outstanding is ${inr.format(outstanding)}`);
      return;
    }

    const res = await fetch(`/api/invoices/${invoiceId}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: amt,
        paymentDate: values.paymentDate,
        method: values.method,
        reference: values.reference?.trim() || null,
        notes: values.notes?.trim() || null,
      }),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: unknown };

    if (!res.ok) {
      const msg =
        typeof json.error === "string"
          ? json.error
          : "Could not record payment";
      setFormError(msg);
      return;
    }

    reset({
      amount: "",
      paymentDate: new Date().toISOString().slice(0, 10),
      method: values.method,
      reference: "",
      notes: "",
    });
    router.refresh();
  }

  async function markFullyPaid() {
    setMarkBusy(true);
    setFormError(null);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/mark-paid`, {
        method: "PATCH",
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        setFormError(json.error ?? "Could not mark as paid");
        return;
      }
      router.refresh();
    } finally {
      setMarkBusy(false);
    }
  }

  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-sm font-medium">Payments</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Outstanding:{" "}
            <span className="font-medium text-foreground tabular-nums">
              {inr.format(outstanding)}
            </span>
          </p>
        </div>
        {!isPaid ? (
          <Button
            type="button"
            size="sm"
            disabled={markBusy}
            onClick={() => void markFullyPaid()}
          >
            {markBusy ? "Updating…" : "Mark fully paid"}
          </Button>
        ) : null}
      </div>

      {payments.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          No payments recorded yet.
        </p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[480px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="pb-2 font-medium">Date</th>
                <th className="pb-2 font-medium">Method</th>
                <th className="pb-2 font-medium">Reference</th>
                <th className="pb-2 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-b border-border/80">
                  <td className="py-2 tabular-nums text-muted-foreground">
                    {p.paymentDate}
                  </td>
                  <td className="py-2">{paymentMethodLabel(p.method)}</td>
                  <td className="max-w-[200px] truncate py-2 text-muted-foreground">
                    {p.reference ?? "—"}
                  </td>
                  <td className="py-2 text-right tabular-nums font-medium">
                    {inr.format(Number(p.amount))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {payments.some((p) => p.notes) ? (
            <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
              {payments
                .filter((p) => p.notes)
                .map((p) => (
                  <li key={`${p.id}-note`}>
                    <span className="tabular-nums">{p.paymentDate}</span>:{" "}
                    {p.notes}
                  </li>
                ))}
            </ul>
          ) : null}
        </div>
      )}

      {!isPaid ? (
        <form
          className="mt-4 space-y-3 border-t border-border pt-4"
          onSubmit={(e) => void handleSubmit(onSubmit)(e)}
        >
          <h3 className="text-xs font-medium text-muted-foreground">
            Record partial payment
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="pay-amount" className="text-xs font-medium">
                Amount (INR) *
              </label>
              <input
                id="pay-amount"
                type="text"
                inputMode="decimal"
                className="mt-1 h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none ring-ring focus-visible:ring-2"
                {...register("amount")}
              />
              {errors.amount ? (
                <p className="mt-1 text-xs text-destructive">
                  {errors.amount.message}
                </p>
              ) : null}
            </div>
            <div>
              <label htmlFor="pay-date" className="text-xs font-medium">
                Payment date *
              </label>
              <input
                id="pay-date"
                type="date"
                className="mt-1 h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none ring-ring focus-visible:ring-2"
                {...register("paymentDate")}
              />
              {errors.paymentDate ? (
                <p className="mt-1 text-xs text-destructive">
                  {errors.paymentDate.message}
                </p>
              ) : null}
            </div>
            <div>
              <label htmlFor="pay-method" className="text-xs font-medium">
                Method *
              </label>
              <select
                id="pay-method"
                className="mt-1 h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none ring-ring focus-visible:ring-2"
                {...register("method")}
              >
                {METHOD_OPTIONS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="pay-ref" className="text-xs font-medium">
                Reference
              </label>
              <input
                id="pay-ref"
                type="text"
                placeholder="Txn ID, cheque no., etc."
                className="mt-1 h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none ring-ring focus-visible:ring-2"
                {...register("reference")}
              />
            </div>
          </div>
          <div>
            <label htmlFor="pay-notes" className="text-xs font-medium">
              Notes (optional)
            </label>
            <input
              id="pay-notes"
              type="text"
              className="mt-1 h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none ring-ring focus-visible:ring-2"
              {...register("notes")}
            />
          </div>
          {formError ? (
            <p className="text-sm text-destructive">{formError}</p>
          ) : null}
          <Button
            type="submit"
            size="sm"
            disabled={isSubmitting}
            aria-busy={isSubmitting}
            className="gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="size-3.5 shrink-0 animate-spin" aria-hidden />
                Saving…
              </>
            ) : (
              "Add payment"
            )}
          </Button>
        </form>
      ) : null}
    </section>
  );
}
