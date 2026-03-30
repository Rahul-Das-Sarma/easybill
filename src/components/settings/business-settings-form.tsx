"use client";

import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";

type SettingsData = {
  companyName: string;
  address: string;
  phone: string | null;
  gstNumber: string | null;
  companyLogoUrl: string | null;
  invoicePrefix: string;
};

export function BusinessSettingsForm({ initial }: { initial: SettingsData }) {
  const [companyName, setCompanyName] = useState(initial.companyName);
  const [address, setAddress] = useState(initial.address);
  const [phone, setPhone] = useState(initial.phone ?? "");
  const [gstNumber, setGstNumber] = useState(initial.gstNumber ?? "");
  const [invoicePrefix, setInvoicePrefix] = useState(initial.invoicePrefix ?? "INV");
  const [logoUrl, setLogoUrl] = useState(initial.companyLogoUrl ?? "");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  async function saveSettings() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName,
          address,
          phone,
          gstNumber,
          invoicePrefix,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!res.ok) {
        setMessage(json.error ?? "Failed to save settings");
        return;
      }
      setMessage("Settings saved.");
    } finally {
      setSaving(false);
    }
  }

  async function uploadLogo() {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setUploading(true);
    setMessage(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/settings/logo", { method: "POST", body: fd });
      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
        companyLogoUrl?: string;
      };
      if (!res.ok) {
        setMessage(json.error ?? "Logo upload failed");
        return;
      }
      setLogoUrl(json.companyLogoUrl ?? "");
      if (fileRef.current) fileRef.current.value = "";
      setMessage("Logo uploaded.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="text-sm font-medium">Business profile</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Update details shown on invoices.
        </p>
        <div className="mt-4 grid gap-4">
          <div>
            <label htmlFor="companyName" className="text-xs font-medium">
              Company name
            </label>
            <input
              id="companyName"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="mt-1 h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none ring-ring focus-visible:ring-2"
            />
          </div>
          <div>
            <label htmlFor="invoicePrefix" className="text-xs font-medium">
              Invoice prefix
            </label>
            <input
              id="invoicePrefix"
              value={invoicePrefix}
              onChange={(e) => setInvoicePrefix(e.target.value.toUpperCase())}
              className="mt-1 h-9 w-full rounded-lg border border-input bg-background px-3 text-sm uppercase outline-none ring-ring focus-visible:ring-2"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Example generated number: {invoicePrefix || "INV"}-{new Date().getFullYear()}-001
            </p>
          </div>
          <div>
            <label htmlFor="address" className="text-xs font-medium">
              Address
            </label>
            <textarea
              id="address"
              rows={3}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none ring-ring focus-visible:ring-2"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="phone" className="text-xs font-medium">
                Phone
              </label>
              <input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1 h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none ring-ring focus-visible:ring-2"
              />
            </div>
            <div>
              <label htmlFor="gstNumber" className="text-xs font-medium">
                GST number
              </label>
              <input
                id="gstNumber"
                value={gstNumber}
                onChange={(e) => setGstNumber(e.target.value)}
                className="mt-1 h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none ring-ring focus-visible:ring-2"
              />
            </div>
          </div>
          <div>
            <Button type="button" size="sm" onClick={() => void saveSettings()} disabled={saving}>
              {saving ? "Saving..." : "Save settings"}
            </Button>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="text-sm font-medium">Company logo</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload PNG/JPG/WEBP (max 2MB). Stored in Supabase Storage.
        </p>
        <div className="mt-4 space-y-3">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt="Company logo"
              className="h-20 w-auto rounded border border-border bg-background p-2"
            />
          ) : (
            <div className="flex h-20 items-center justify-center rounded border border-dashed border-border text-xs text-muted-foreground">
              No logo uploaded
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" />
            <Button type="button" variant="outline" size="sm" onClick={() => void uploadLogo()} disabled={uploading}>
              {uploading ? "Uploading..." : "Upload logo"}
            </Button>
          </div>
        </div>
      </section>

      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
    </div>
  );
}
