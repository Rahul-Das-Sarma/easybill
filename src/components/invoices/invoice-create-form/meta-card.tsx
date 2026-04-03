"use client";

import type { UseFormRegister } from "react-hook-form";

import type { InvoiceCreateFormValues } from "@/lib/invoice-create-form-schema";

type Props = {
  defaultInvoiceNumber: string;
  register: UseFormRegister<InvoiceCreateFormValues>;
};

export function InvoiceMetaCard({ defaultInvoiceNumber, register }: Props) {
  return (
    <div className="space-y-4 rounded-xl border border-border bg-card p-5 shadow-sm">
      <h2 className="text-sm font-medium">Invoice</h2>
      <div>
        <label className="text-xs font-medium text-muted-foreground">
          Invoice number
        </label>
        <input
          readOnly
          value={defaultInvoiceNumber}
          className="mt-1 h-9 w-full rounded-lg border border-input bg-muted/50 px-3 text-sm"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Final number is assigned when you save (per year, unique for you).
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="issueDate" className="text-xs font-medium">
            Issue date
          </label>
          <input
            id="issueDate"
            type="date"
            className="mt-1 h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
            {...register("issueDate")}
          />
        </div>
        <div>
          <label htmlFor="dueDate" className="text-xs font-medium">
            Due date
          </label>
          <input
            id="dueDate"
            type="date"
            className="mt-1 h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
            {...register("dueDate")}
          />
        </div>
      </div>
    </div>
  );
}
