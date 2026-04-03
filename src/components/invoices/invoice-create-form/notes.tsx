"use client";

import type { UseFormRegister } from "react-hook-form";

import type { InvoiceCreateFormValues } from "@/lib/invoice-create-form-schema";

type Props = {
  register: UseFormRegister<InvoiceCreateFormValues>;
};

export function InvoiceCreateFormNotes({ register }: Props) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div>
        <label htmlFor="notes" className="text-sm font-medium">
          Internal notes
        </label>
        <p className="text-xs text-muted-foreground">
          Not shown on the PDF — for your team only.
        </p>
        <textarea
          id="notes"
          rows={3}
          className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
          placeholder="e.g. follow up next week"
          {...register("notes")}
        />
      </div>
      <div>
        <label htmlFor="customerNotes" className="text-sm font-medium">
          Customer notes / terms
        </label>
        <p className="text-xs text-muted-foreground">
          Printed on the PDF — bank details, T&amp;C, thank you message.
        </p>
        <textarea
          id="customerNotes"
          rows={3}
          className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
          placeholder="e.g. Pay to HDFC XX1234…"
          {...register("customerNotes")}
        />
      </div>
    </div>
  );
}
