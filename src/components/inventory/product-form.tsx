"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { GST_RATES } from "@/lib/invoice-math";
import type { ProductJson } from "@/lib/product-json";
import { cn } from "@/lib/utils";
import { ChevronDown, Loader2, Trash2 } from "lucide-react";

const gstRateSchema = z.union([
  z.literal(0),
  z.literal(5),
  z.literal(12),
  z.literal(18),
  z.literal(28),
]);

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  description: z.string().optional(),
  quantity: z.preprocess(
    (v) => (typeof v === "string" ? Number(v) : v),
    z.number().min(0, "Quantity cannot be negative"),
  ),
  unitPrice: z.preprocess(
    (v) => (typeof v === "string" ? Number(v) : v),
    z.number().min(0, "Price cannot be negative"),
  ),
  taxRate: z.preprocess(
    (v) => (typeof v === "string" ? Number(v) : v),
    gstRateSchema,
  ),
  isActive: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

const fieldClass =
  "h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-sm transition-colors placeholder:text-muted-foreground/80 hover:border-border focus-visible:border-primary/50 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/15";

function FieldLabel({
  htmlFor,
  children,
  hint,
  required,
}: {
  htmlFor: string;
  children: ReactNode;
  hint?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-1">
      <label
        htmlFor={htmlFor}
        className="flex items-baseline gap-1 text-sm font-medium text-foreground"
      >
        {children}
        {required ? (
          <span className="text-destructive" aria-hidden>
            *
          </span>
        ) : null}
      </label>
      {hint ? (
        <p className="text-xs leading-relaxed text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

function SectionHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="border-b border-border bg-muted/40 px-6 py-4 sm:px-8">
      <h2 className="text-sm font-semibold tracking-tight text-foreground">
        {title}
      </h2>
      <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

function emptyToNull(s: string | undefined) {
  const t = s?.trim();
  return t ? t : null;
}

function messageFromApiError(error: unknown, fallback: string) {
  if (typeof error === "string") return error;
  if (!error || typeof error !== "object") return fallback;
  for (const v of Object.values(error as Record<string, unknown>)) {
    if (Array.isArray(v) && typeof v[0] === "string") return v[0];
  }
  return fallback;
}

type Props = {
  mode: "create" | "edit";
  productId?: string;
  initial?: ProductJson;
};

export function ProductForm({ mode, productId, initial }: Props) {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as never,
    defaultValues: {
      name: initial?.name ?? "",
      sku: initial?.sku ?? "",
      barcode: initial?.barcode ?? "",
      description: initial?.description ?? "",
      quantity: initial?.quantity ?? 0,
      unitPrice: initial?.unitPrice ?? 0,
      taxRate: (initial?.taxRate ?? 18) as FormValues["taxRate"],
      isActive: initial?.isActive ?? true,
    },
  });

  const busy = form.formState.isSubmitting;

  async function onSubmit(values: FormValues) {
    setSubmitError(null);
    const body = {
      name: values.name.trim(),
      sku: emptyToNull(values.sku),
      barcode: emptyToNull(values.barcode),
      description: values.description?.trim() || null,
      quantity: values.quantity,
      unitPrice: values.unitPrice,
      taxRate: values.taxRate,
      isActive: values.isActive,
    };

    try {
      if (mode === "create") {
        const res = await fetch("/api/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = (await res.json()) as { error?: unknown; product?: ProductJson };
        if (!res.ok) {
          setSubmitError(
            messageFromApiError(data.error, "Could not create product"),
          );
          return;
        }
        if (data.product) {
          router.push("/inventory");
          router.refresh();
        }
        return;
      }

      if (!productId) return;
      const res = await fetch(`/api/products/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { error?: unknown; product?: ProductJson };
      if (!res.ok) {
        setSubmitError(
          messageFromApiError(data.error, "Could not update product"),
        );
        return;
      }
      router.refresh();
    } catch {
      setSubmitError("Something went wrong. Try again.");
    }
  }

  async function onDelete() {
    if (!productId) return;
    if (
      !window.confirm(
        "Delete this product permanently? This cannot be undone.",
      )
    ) {
      return;
    }
    setSubmitError(null);
    setDeleting(true);
    try {
      const res = await fetch(`/api/products/${productId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setSubmitError(data.error ?? "Could not delete");
        setDeleting(false);
        return;
      }
      router.push("/inventory");
      router.refresh();
    } catch {
      setSubmitError("Could not delete. Try again.");
      setDeleting(false);
    }
  }

  return (
    <div className="w-full">
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-0">
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          {submitError ? (
            <div className="border-b border-destructive/30 bg-destructive/5 px-6 py-3 sm:px-8">
              <p className="text-sm text-destructive">{submitError}</p>
            </div>
          ) : null}

          <SectionHeader
            title="Product details"
            description="How this item appears on invoices. SKU and barcode must each be unique in your account when set."
          />

          <div className="space-y-6 px-6 py-6 sm:px-8">
            <div className="space-y-2">
              <FieldLabel htmlFor="product-name" required>
                Display name
              </FieldLabel>
              <input
                id="product-name"
                type="text"
                autoComplete="off"
                className={cn(
                  fieldClass,
                  form.formState.errors.name && "border-destructive",
                )}
                aria-invalid={!!form.formState.errors.name}
                {...form.register("name")}
              />
              {form.formState.errors.name ? (
                <p className="text-xs text-destructive">
                  {form.formState.errors.name.message}
                </p>
              ) : null}
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <FieldLabel
                  htmlFor="product-sku"
                  hint="Internal code (optional)."
                >
                  SKU
                </FieldLabel>
                <input
                  id="product-sku"
                  type="text"
                  autoComplete="off"
                  className={fieldClass}
                  {...form.register("sku")}
                />
              </div>
              <div className="space-y-2">
                <FieldLabel
                  htmlFor="product-barcode"
                  hint="Used for scanner lookup."
                >
                  Barcode
                </FieldLabel>
                <input
                  id="product-barcode"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  className={fieldClass}
                  placeholder="EAN or internal code"
                  {...form.register("barcode")}
                />
              </div>
            </div>

            <div className="space-y-2">
              <FieldLabel
                htmlFor="product-desc"
                hint="Optional notes for your team."
              >
                Description
              </FieldLabel>
              <textarea
                id="product-desc"
                rows={3}
                className={cn(
                  fieldClass,
                  "min-h-[88px] resize-y py-2.5 leading-relaxed",
                )}
                {...form.register("description")}
              />
            </div>
          </div>

          <SectionHeader
            title="Stock & pricing"
            description="Quantity on hand and default values when you add this product to an invoice."
          />

          <div className="grid gap-6 px-6 py-6 sm:grid-cols-3 sm:px-8">
            <div className="space-y-2">
              <FieldLabel htmlFor="product-qty" hint="On hand.">
                Quantity
              </FieldLabel>
              <input
                id="product-qty"
                type="number"
                min={0}
                step="any"
                className={cn(
                  fieldClass,
                  "tabular-nums",
                  form.formState.errors.quantity && "border-destructive",
                )}
                {...form.register("quantity")}
              />
              {form.formState.errors.quantity ? (
                <p className="text-xs text-destructive">
                  {form.formState.errors.quantity.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <FieldLabel htmlFor="product-price" hint="Excl. GST.">
                Unit price
              </FieldLabel>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">
                  ₹
                </span>
                <input
                  id="product-price"
                  type="number"
                  min={0}
                  step="0.01"
                  className={cn(
                    fieldClass,
                    "pl-8 tabular-nums",
                    form.formState.errors.unitPrice && "border-destructive",
                  )}
                  {...form.register("unitPrice")}
                />
              </div>
              {form.formState.errors.unitPrice ? (
                <p className="text-xs text-destructive">
                  {form.formState.errors.unitPrice.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <FieldLabel htmlFor="product-tax" hint="GST on line.">
                Tax rate
              </FieldLabel>
              <div className="relative">
                <select
                  id="product-tax"
                  className={cn(
                    fieldClass,
                    "cursor-pointer appearance-none pr-9 tabular-nums",
                  )}
                  {...form.register("taxRate", { valueAsNumber: true })}
                >
                  {GST_RATES.map((r) => (
                    <option key={r} value={r}>
                      {r}%
                    </option>
                  ))}
                </select>
                <ChevronDown
                  className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
              </div>
            </div>
          </div>

          {mode === "edit" ? (
            <div className="border-t border-border px-6 py-5 sm:px-8">
              <label className="flex cursor-pointer gap-3 rounded-lg border border-border bg-muted/30 p-4 transition-colors hover:bg-muted/50">
                <input
                  type="checkbox"
                  className="mt-0.5 size-4 shrink-0 rounded border-input accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
                  {...form.register("isActive")}
                />
                <span className="text-sm leading-snug">
                  <span className="font-medium text-foreground">Active</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    Inactive products are hidden from barcode lookup.
                  </span>
                </span>
              </label>
            </div>
          ) : null}

          <div className="flex flex-col gap-3 border-t border-border bg-muted/30 px-6 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8">
            <div className="flex flex-wrap items-center gap-2">
              <Button type="submit" disabled={busy || deleting}>
                {busy ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                    Saving…
                  </>
                ) : mode === "create" ? (
                  "Create product"
                ) : (
                  "Save changes"
                )}
              </Button>
              <Link
                href="/inventory"
                className={cn(
                  buttonVariants({ variant: "outline", size: "default" }),
                )}
              >
                Cancel
              </Link>
            </div>
            {mode === "edit" && productId ? (
              <Button
                type="button"
                variant="ghost"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive sm:order-last"
                disabled={busy || deleting}
                onClick={() => void onDelete()}
              >
                {deleting ? (
                  <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                ) : (
                  <Trash2 className="mr-2 size-4" aria-hidden />
                )}
                Delete product
              </Button>
            ) : null}
          </div>
        </div>
      </form>
    </div>
  );
}
