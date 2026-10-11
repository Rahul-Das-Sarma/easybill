"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  GST_SCHEMES,
  INDIAN_STATE_CODES,
  stateCodeFromGstin,
  type GstScheme,
} from "@/lib/gst-india";
import { cn } from "@/lib/utils";
import { Factory, Store } from "lucide-react";

type BusinessType = "trading" | "manufacturer";

type SettingsData = {
  companyName: string;
  address: string;
  phone: string | null;
  gstNumber: string | null;
  companyLogoUrl: string | null;
  invoicePrefix: string;
  businessType: BusinessType;
  gstScheme: GstScheme;
  stateCode: string | null;
  city: string | null;
  pincode: string | null;
  einvoiceUsername: string | null;
  einvoiceClientId: string | null;
  einvoiceEnv: string;
  einvoicePublicKey: string;
  hasEinvoicePassword: boolean;
  hasEinvoiceSecret: boolean;
};

export function BusinessSettingsForm({ initial }: { initial: SettingsData }) {
  const router = useRouter();
  const [companyName, setCompanyName] = useState(initial.companyName);
  const [address, setAddress] = useState(initial.address);
  const [phone, setPhone] = useState(initial.phone ?? "");
  const [gstNumber, setGstNumber] = useState(initial.gstNumber ?? "");
  const [invoicePrefix, setInvoicePrefix] = useState(initial.invoicePrefix ?? "INV");
  const [businessType, setBusinessType] = useState<BusinessType>(
    initial.businessType,
  );
  const [gstScheme, setGstScheme] = useState<GstScheme>(initial.gstScheme);
  const [city, setCity] = useState(initial.city ?? "");
  const [pincode, setPincode] = useState(initial.pincode ?? "");
  const [einvoiceUsername, setEinvoiceUsername] = useState(
    initial.einvoiceUsername ?? "",
  );
  const [einvoicePassword, setEinvoicePassword] = useState("");
  const [einvoiceClientId, setEinvoiceClientId] = useState(
    initial.einvoiceClientId ?? "",
  );
  const [einvoiceClientSecret, setEinvoiceClientSecret] = useState("");
  const [einvoicePublicKey, setEinvoicePublicKey] = useState(
    initial.einvoicePublicKey,
  );
  const [einvoiceEnv, setEinvoiceEnv] = useState(
    initial.einvoiceEnv === "production" ? "production" : "sandbox",
  );
  const [stateCode, setStateCode] = useState(initial.stateCode ?? "");
  const [logoUrl, setLogoUrl] = useState(initial.companyLogoUrl ?? "");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  function onGstNumberChange(value: string) {
    setGstNumber(value);
    const fromGstin = stateCodeFromGstin(value);
    if (fromGstin) setStateCode(fromGstin);
  }

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
          businessType,
          gstScheme,
          stateCode: stateCode || null,
          city,
          pincode,
          einvoiceUsername,
          einvoiceClientId,
          einvoicePublicKey,
          einvoiceEnv,
          ...(einvoicePassword ? { einvoicePassword } : {}),
          ...(einvoiceClientSecret ? { einvoiceClientSecret } : {}),
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
      window.dispatchEvent(new Event("easybill:business-type"));
      router.refresh();
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
        <h2 className="text-sm font-medium">Business type</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Trading for retail; manufacturers get raw materials, BOM, and production.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setBusinessType("trading")}
            className={cn(
              "flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-colors",
              businessType === "trading"
                ? "border-brand-500 bg-brand-50"
                : "border-border hover:bg-muted/50",
            )}
          >
            <Store className="size-5 text-brand-700" aria-hidden />
            <span className="text-sm font-semibold">Trading / retail</span>
            <span className="text-xs text-muted-foreground">
              Buy and sell finished products.
            </span>
          </button>
          <button
            type="button"
            onClick={() => setBusinessType("manufacturer")}
            className={cn(
              "flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-colors",
              businessType === "manufacturer"
                ? "border-brand-500 bg-brand-50"
                : "border-border hover:bg-muted/50",
            )}
          >
            <Factory className="size-5 text-brand-700" aria-hidden />
            <span className="text-sm font-semibold">Manufacturer</span>
            <span className="text-xs text-muted-foreground">
              Raw materials, BOM, and production runs.
            </span>
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="text-sm font-medium">GST registration</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Controls how tax appears on invoices. You can change this anytime.
        </p>
        <div className="mt-4 space-y-3">
          {GST_SCHEMES.map((scheme) => (
            <button
              key={scheme.value}
              type="button"
              onClick={() => setGstScheme(scheme.value)}
              className={cn(
                "flex w-full flex-col items-start gap-1 rounded-xl border p-4 text-left transition-colors",
                gstScheme === scheme.value
                  ? "border-brand-500 bg-brand-50"
                  : "border-border hover:bg-muted/50",
              )}
            >
              <span className="text-sm font-semibold">{scheme.label}</span>
              <span className="text-xs text-muted-foreground">
                {scheme.description}
              </span>
            </button>
          ))}
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="gstNumber" className="text-xs font-medium">
              GSTIN
            </label>
            <input
              id="gstNumber"
              value={gstNumber}
              onChange={(e) => onGstNumberChange(e.target.value)}
              placeholder="22AAAAA0000A1Z5"
              className="mt-1 h-9 w-full rounded-lg border border-input bg-background px-3 text-sm uppercase outline-none ring-ring focus-visible:ring-2"
            />
          </div>
          <div>
            <label htmlFor="stateCode" className="text-xs font-medium">
              State
            </label>
            <select
              id="stateCode"
              value={stateCode}
              onChange={(e) => setStateCode(e.target.value)}
              className="mt-1 h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none ring-ring focus-visible:ring-2"
            >
              <option value="">Select state</option>
              {INDIAN_STATE_CODES.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-muted-foreground">
              Used for CGST/SGST vs IGST on invoices.
            </p>
          </div>
        </div>
      </section>

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
              <label htmlFor="city" className="text-xs font-medium">
                City
              </label>
              <input
                id="city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="mt-1 h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none ring-ring focus-visible:ring-2"
              />
            </div>
            <div>
              <label htmlFor="pincode" className="text-xs font-medium">
                PIN code
              </label>
              <input
                id="pincode"
                value={pincode}
                inputMode="numeric"
                onChange={(e) => setPincode(e.target.value)}
                className="mt-1 h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none ring-ring focus-visible:ring-2"
              />
            </div>
          </div>
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

      <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="text-sm font-medium">E-invoice portal</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Credentials from the NIC e-invoice API portal. The public key is the
          PEM downloaded from that portal. Passwords are stored encrypted.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="einvoice-env" className="text-xs font-medium">
              Environment
            </label>
            <select
              id="einvoice-env"
              value={einvoiceEnv}
              onChange={(e) => setEinvoiceEnv(e.target.value)}
              className="mt-1 h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
            >
              <option value="sandbox">Sandbox</option>
              <option value="production">Production</option>
            </select>
          </div>
          <div>
            <label htmlFor="einvoice-user" className="text-xs font-medium">
              API username
            </label>
            <input
              id="einvoice-user"
              value={einvoiceUsername}
              onChange={(e) => setEinvoiceUsername(e.target.value)}
              className="mt-1 h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
            />
          </div>
          <div>
            <label htmlFor="einvoice-password" className="text-xs font-medium">
              API password
            </label>
            <input
              id="einvoice-password"
              type="password"
              value={einvoicePassword}
              placeholder={initial.hasEinvoicePassword ? "Saved" : ""}
              onChange={(e) => setEinvoicePassword(e.target.value)}
              className="mt-1 h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
            />
          </div>
          <div>
            <label htmlFor="einvoice-client" className="text-xs font-medium">
              Client id
            </label>
            <input
              id="einvoice-client"
              value={einvoiceClientId}
              onChange={(e) => setEinvoiceClientId(e.target.value)}
              className="mt-1 h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="einvoice-secret" className="text-xs font-medium">
              Client secret
            </label>
            <input
              id="einvoice-secret"
              type="password"
              value={einvoiceClientSecret}
              placeholder={initial.hasEinvoiceSecret ? "Saved" : ""}
              onChange={(e) => setEinvoiceClientSecret(e.target.value)}
              className="mt-1 h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="einvoice-key" className="text-xs font-medium">
              Portal public key
            </label>
            <textarea
              id="einvoice-key"
              rows={4}
              value={einvoicePublicKey}
              onChange={(e) => setEinvoicePublicKey(e.target.value)}
              placeholder="-----BEGIN PUBLIC KEY-----"
              className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 font-mono text-xs"
            />
          </div>
        </div>
      </section>

      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
    </div>
  );
}
