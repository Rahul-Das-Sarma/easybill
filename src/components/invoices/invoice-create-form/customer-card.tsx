"use client";

import type { UseFormReturn } from "react-hook-form";

import { Button } from "@/components/ui/button";
import type { InvoiceCreateFormValues } from "@/lib/invoice-create-form-schema";
import { UserPlus } from "lucide-react";

import type { InvoiceCustomerSearchHit } from "./types";

type Props = {
  form: UseFormReturn<InvoiceCreateFormValues>;
  searchQ: string;
  setSearchQ: (v: string) => void;
  searchOpen: boolean;
  setSearchOpen: (v: boolean) => void;
  hits: InvoiceCustomerSearchHit[];
  onOpenNewCustomer: () => void;
};

export function InvoiceCustomerCard({
  form,
  searchQ,
  setSearchQ,
  searchOpen,
  setSearchOpen,
  hits,
  onOpenNewCustomer,
}: Props) {
  const selectedId = form.watch("customerId");
  const selectedCustomer = hits.find((h) => h.id === selectedId);

  return (
    <div className="space-y-4 rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-medium">Customer</h2>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={onOpenNewCustomer}
        >
          <UserPlus className="size-4" aria-hidden />
          Add new customer
        </Button>
      </div>

      <div className="relative">
        <label className="text-xs font-medium text-muted-foreground">
          Search customers
        </label>
        <input
          type="search"
          className="mt-1 h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
          placeholder="Name, email, phone, GSTIN…"
          value={searchQ}
          onChange={(e) => {
            setSearchQ(e.target.value);
            setSearchOpen(true);
          }}
          onFocus={() => setSearchOpen(true)}
        />
        {searchOpen && hits.length > 0 ? (
          <ul
            className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-border bg-popover py-1 text-sm shadow-md"
            role="listbox"
          >
            {hits.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  className="flex w-full flex-col px-3 py-2 text-left hover:bg-muted"
                  onClick={() => {
                    form.setValue("customerId", c.id);
                    setSearchQ(c.name);
                    setSearchOpen(false);
                  }}
                >
                  <span className="font-medium">{c.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {[c.email, c.gstNumber].filter(Boolean).join(" · ") ||
                      c.id.slice(0, 8)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        {selectedCustomer ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Selected:{" "}
            <span className="font-medium text-foreground">
              {selectedCustomer.name}
            </span>
          </p>
        ) : null}
        <input type="hidden" {...form.register("customerId")} />
        {form.formState.errors.customerId ? (
          <p className="mt-1 text-xs text-destructive">
            {form.formState.errors.customerId.message}
          </p>
        ) : null}
      </div>
    </div>
  );
}
