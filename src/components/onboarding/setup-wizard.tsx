"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  GST_SCHEMES,
  INDIAN_STATE_CODES,
  stateCodeFromGstin,
  type GstScheme,
} from "@/lib/gst-india";
import { cn } from "@/lib/utils";
import { Factory, Receipt, Store } from "lucide-react";

type BusinessType = "trading" | "manufacturer";

type OnboardingProfile = {
  businessType: BusinessType;
  companyName: string;
  address: string;
  phone: string | null;
  invoicePrefix: string;
  gstScheme: GstScheme;
  gstNumber: string | null;
  stateCode: string | null;
};

const STEPS = ["Business", "Company", "GST"] as const;

/**
 * Full-screen setup wizard shown until onboarding is completed.
 * Replaces the old business-type-only modal.
 */
export function SetupWizard() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [businessType, setBusinessType] = useState<BusinessType>("trading");
  const [companyName, setCompanyName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [invoicePrefix, setInvoicePrefix] = useState("INV");
  const [gstScheme, setGstScheme] = useState<GstScheme>("regular");
  const [gstNumber, setGstNumber] = useState("");
  const [stateCode, setStateCode] = useState("");

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/onboarding")
      .then((res) => (res.ok ? res.json() : null))
      .then(
        (
          data: {
            onboardingCompleted?: boolean;
            profile?: OnboardingProfile;
          } | null,
        ) => {
          if (cancelled || !data) return;
          if (data.onboardingCompleted) return;

          const p = data.profile;
          if (p) {
            setBusinessType(p.businessType);
            setCompanyName(p.companyName === "My business" ? "" : p.companyName);
            setAddress(p.address === "—" ? "" : p.address);
            setPhone(p.phone ?? "");
            setInvoicePrefix(p.invoicePrefix ?? "INV");
            setGstScheme(p.gstScheme ?? "regular");
            setGstNumber(p.gstNumber ?? "");
            setStateCode(p.stateCode ?? "");
          }
          setOpen(true);
        },
      )
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  function onGstNumberChange(value: string) {
    setGstNumber(value);
    const fromGstin = stateCodeFromGstin(value);
    if (fromGstin) setStateCode(fromGstin);
  }

  function validateStep(): string | null {
    if (step === 1) {
      if (!companyName.trim()) return "Enter your company or business name.";
      if (!address.trim()) return "Enter your business address.";
      if (!invoicePrefix.trim()) return "Enter an invoice prefix.";
    }
    if (step === 2 && gstScheme === "regular" && !stateCode) {
      return "Select your state for GST invoices.";
    }
    return null;
  }

  function next() {
    const msg = validateStep();
    if (msg) {
      setError(msg);
      return;
    }
    setError(null);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function back() {
    setError(null);
    setStep((s) => Math.max(s - 1, 0));
  }

  async function finish() {
    const msg = validateStep();
    if (msg) {
      setError(msg);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessType,
          companyName: companyName.trim(),
          address: address.trim(),
          phone: phone.trim() || null,
          invoicePrefix,
          gstScheme,
          gstNumber: gstNumber.trim() || null,
          stateCode: stateCode || null,
        }),
      });
      if (!res.ok) {
        setError("Could not save setup. Check your entries and try again.");
        return;
      }
      setOpen(false);
      window.dispatchEvent(new Event("easybill:business-type"));
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-background p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="setup-wizard-title"
    >
      <div className="flex max-h-[min(92vh,720px)] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
        <div className="border-b border-border px-6 py-5">
          <div className="flex items-center gap-2 text-brand">
            <Receipt className="size-5" aria-hidden />
            <span className="text-sm font-semibold tracking-tight">EasyBill</span>
          </div>
          <h2 id="setup-wizard-title" className="mt-3 text-xl font-semibold">
            Set up your business
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            A few details so invoices, inventory, and GST work correctly. You can
            change everything later in Settings.
          </p>
          <div className="mt-4 flex gap-2">
            {STEPS.map((label, i) => (
              <div
                key={label}
                className={cn(
                  "h-1 flex-1 rounded-full transition-colors",
                  i <= step ? "bg-brand" : "bg-muted",
                )}
                aria-hidden
              />
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Step {step + 1} of {STEPS.length}: {STEPS[step]}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {step === 0 ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                How do you run your business?
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
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
                    Raw materials, BOM, and production.
                  </span>
                </button>
              </div>
            </div>
          ) : null}

          {step === 1 ? (
            <div className="space-y-4">
              <div>
                <label htmlFor="setup-company" className="text-xs font-medium">
                  Company / business name
                </label>
                <input
                  id="setup-company"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Acme Traders"
                  className="mt-1 h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
                />
              </div>
              <div>
                <label htmlFor="setup-address" className="text-xs font-medium">
                  Address
                </label>
                <textarea
                  id="setup-address"
                  rows={3}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Street, city, PIN"
                  className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="setup-phone" className="text-xs font-medium">
                    Phone (optional)
                  </label>
                  <input
                    id="setup-phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="mt-1 h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="setup-prefix" className="text-xs font-medium">
                    Invoice prefix
                  </label>
                  <input
                    id="setup-prefix"
                    value={invoicePrefix}
                    onChange={(e) =>
                      setInvoicePrefix(e.target.value.toUpperCase())
                    }
                    className="mt-1 h-9 w-full rounded-lg border border-input bg-background px-3 text-sm uppercase"
                  />
                </div>
              </div>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                How are you registered for GST?
              </p>
              <div className="space-y-2">
                {GST_SCHEMES.map((scheme) => (
                  <button
                    key={scheme.value}
                    type="button"
                    onClick={() => setGstScheme(scheme.value)}
                    className={cn(
                      "flex w-full flex-col items-start gap-1 rounded-xl border p-3 text-left transition-colors",
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
              {gstScheme !== "unregistered" ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="setup-gstin" className="text-xs font-medium">
                      GSTIN {gstScheme === "composition" ? "(optional)" : ""}
                    </label>
                    <input
                      id="setup-gstin"
                      value={gstNumber}
                      onChange={(e) => onGstNumberChange(e.target.value)}
                      className="mt-1 h-9 w-full rounded-lg border border-input bg-background px-3 text-sm uppercase"
                    />
                  </div>
                  <div>
                    <label htmlFor="setup-state" className="text-xs font-medium">
                      State
                      {gstScheme === "regular" ? " *" : ""}
                    </label>
                    <select
                      id="setup-state"
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
              ) : null}
            </div>
          ) : null}

          {error ? (
            <p className="mt-4 text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
        </div>

        <div className="flex justify-between border-t border-border px-6 py-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={step === 0 || saving}
            onClick={back}
          >
            Back
          </Button>
          {step < STEPS.length - 1 ? (
            <Button type="button" size="sm" onClick={next}>
              Continue
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              disabled={saving}
              onClick={() => void finish()}
            >
              {saving ? "Saving…" : "Get started"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
