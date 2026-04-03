"use client";

import type { FormEvent, RefObject } from "react";

import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

type Props = {
  dialogRef: RefObject<HTMLDialogElement | null>;
  onClose: () => void;
  name: string;
  setName: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  phone: string;
  setPhone: (v: string) => void;
  address: string;
  setAddress: (v: string) => void;
  gst: string;
  setGst: (v: string) => void;
  error: string | null;
  submitting: boolean;
  onSubmit: (e: FormEvent) => void | Promise<void>;
};

export function InvoiceCustomerDialog({
  dialogRef,
  onClose,
  name,
  setName,
  email,
  setEmail,
  phone,
  setPhone,
  address,
  setAddress,
  gst,
  setGst,
  error,
  submitting,
  onSubmit,
}: Props) {
  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="new-customer-title"
      aria-modal="true"
      className="fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-card p-0 shadow-lg backdrop:bg-black/40"
      onClose={onClose}
    >
      <form
        onSubmit={onSubmit}
        className="flex max-h-[min(90vh,640px)] flex-col"
      >
        <div className="border-b border-border px-5 py-4">
          <h3 id="new-customer-title" className="text-base font-semibold">
            New customer
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Saved to your customer list — you can search and select them for
            future invoices.
          </p>
        </div>
        <div className="space-y-3 overflow-y-auto px-5 py-4">
          <div>
            <label htmlFor="new-customer-name" className="text-xs font-medium">
              Name <span className="text-destructive">*</span>
            </label>
            <input
              id="new-customer-name"
              required
              className="mt-1 h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label
                htmlFor="new-customer-email"
                className="text-xs font-medium"
              >
                Email
              </label>
              <input
                id="new-customer-email"
                type="email"
                className="mt-1 h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
            <div>
              <label
                htmlFor="new-customer-phone"
                className="text-xs font-medium"
              >
                Phone
              </label>
              <input
                id="new-customer-phone"
                type="tel"
                className="mt-1 h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoComplete="tel"
              />
            </div>
          </div>
          <div>
            <label htmlFor="new-customer-address" className="text-xs font-medium">
              Address
            </label>
            <textarea
              id="new-customer-address"
              rows={2}
              className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="new-customer-gst" className="text-xs font-medium">
              GSTIN
            </label>
            <input
              id="new-customer-gst"
              className="mt-1 h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
              value={gst}
              onChange={(e) => setGst(e.target.value)}
            />
          </div>
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap justify-end gap-2 border-t border-border px-5 py-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => dialogRef.current?.close()}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={submitting}
            className="gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Saving…
              </>
            ) : (
              "Create customer"
            )}
          </Button>
        </div>
      </form>
    </dialog>
  );
}
