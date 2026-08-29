"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { INDIAN_STATE_CODES, stateCodeFromGstin } from "@/lib/gst-india";
import { Loader2 } from "lucide-react";

type CustomerData = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  gstNumber: string | null;
  stateCode: string | null;
};

export function CustomerEditCard({ customer }: { customer: CustomerData }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(customer.name);
  const [email, setEmail] = useState(customer.email ?? "");
  const [phone, setPhone] = useState(customer.phone ?? "");
  const [address, setAddress] = useState(customer.address ?? "");
  const [gst, setGst] = useState(customer.gstNumber ?? "");
  const [stateCode, setStateCode] = useState(customer.stateCode ?? "");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function onGstChange(value: string) {
    setGst(value);
    const fromGstin = stateCodeFromGstin(value);
    if (fromGstin) setStateCode(fromGstin);
  }

  function resetForm() {
    setName(customer.name);
    setEmail(customer.email ?? "");
    setPhone(customer.phone ?? "");
    setAddress(customer.address ?? "");
    setGst(customer.gstNumber ?? "");
    setStateCode(customer.stateCode ?? "");
    setError(null);
  }

  async function onSave() {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/customers/${customer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim() || null,
          phone: phone.trim() || null,
          address: address.trim() || null,
          gstNumber: gst.trim() || null,
          stateCode: stateCode || null,
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(json.error ?? "Could not save customer.");
        return;
      }
      setEditing(false);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  if (!editing) {
    return (
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm lg:col-span-1">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-medium">Details</h2>
          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={() => setEditing(true)}
          >
            Edit
          </Button>
        </div>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Name</dt>
            <dd className="text-right font-medium">{customer.name}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Email</dt>
            <dd className="text-right">{customer.email ?? "—"}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Phone</dt>
            <dd className="text-right">{customer.phone ?? "—"}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Address</dt>
            <dd className="text-right">{customer.address ?? "—"}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">GSTIN</dt>
            <dd className="text-right">{customer.gstNumber ?? "—"}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">State</dt>
            <dd className="text-right">
              {INDIAN_STATE_CODES.find((s) => s.code === customer.stateCode)
                ?.name ?? "—"}
            </dd>
          </div>
        </dl>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm lg:col-span-1">
      <h2 className="text-sm font-medium">Edit customer</h2>
      <div className="mt-3 space-y-3 text-sm">
        <div>
          <label htmlFor="cust-name" className="text-xs font-medium">
            Name
          </label>
          <input
            id="cust-name"
            required
            className="mt-1 h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="cust-email" className="text-xs font-medium">
            Email
          </label>
          <input
            id="cust-email"
            type="email"
            className="mt-1 h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="cust-phone" className="text-xs font-medium">
            Phone
          </label>
          <input
            id="cust-phone"
            type="tel"
            className="mt-1 h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="cust-address" className="text-xs font-medium">
            Address
          </label>
          <textarea
            id="cust-address"
            rows={2}
            className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="cust-gst" className="text-xs font-medium">
              GSTIN
            </label>
            <input
              id="cust-gst"
              className="mt-1 h-9 w-full rounded-lg border border-input bg-background px-3 text-sm uppercase"
              value={gst}
              onChange={(e) => onGstChange(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="cust-state" className="text-xs font-medium">
              State
            </label>
            <select
              id="cust-state"
              value={stateCode}
              onChange={(e) => setStateCode(e.target.value)}
              className="mt-1 h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
            >
              <option value="">Select state</option>
              {INDIAN_STATE_CODES.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2 pt-1">
          <Button
            type="button"
            size="sm"
            disabled={submitting}
            onClick={() => void onSave()}
            className="gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Saving…
              </>
            ) : (
              "Save"
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={submitting}
            onClick={() => {
              resetForm();
              setEditing(false);
            }}
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
