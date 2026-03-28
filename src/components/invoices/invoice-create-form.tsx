"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  useFieldArray,
  useForm,
  useWatch,
  type Resolver,
} from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { computeInvoiceLines, GST_RATES } from "@/lib/invoice-math";
import { cn } from "@/lib/utils";
import { Plus, Trash2 } from "lucide-react";

const gstRateSchema = z.union([
  z.literal(0),
  z.literal(5),
  z.literal(12),
  z.literal(18),
  z.literal(28),
]);

const lineSchema = z.object({
  productName: z.string(),
  quantity: z.preprocess(
    (v) => (typeof v === "string" ? Number(v) : v),
    z.number().positive(),
  ),
  unitPrice: z.preprocess(
    (v) => (typeof v === "string" ? Number(v) : v),
    z.number().min(0),
  ),
  taxRate: z.preprocess(
    (v) => (typeof v === "string" ? Number(v) : v),
    gstRateSchema,
  ),
});

const formSchema = z
  .object({
    customerMode: z.enum(["existing", "new"]),
    customerId: z.string().optional(),
    newName: z.string().optional(),
    newEmail: z.string().optional(),
    newPhone: z.string().optional(),
    newAddress: z.string().optional(),
    newGst: z.string().optional(),
    issueDate: z.string().min(1),
    dueDate: z.string().min(1),
    lines: z.array(lineSchema).min(1),
    discountMode: z.enum(["flat", "percent"]),
    discountValue: z.preprocess(
      (v) => {
        const n = typeof v === "string" ? Number(v) : v;
        return Number.isFinite(n) ? n : 0;
      },
      z.number().min(0),
    ),
    notes: z.string().optional(),
    customerNotes: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.customerMode === "existing") {
      const uuid = z.string().uuid().safeParse(data.customerId);
      if (!uuid.success) {
        ctx.addIssue({
          code: "custom",
          message: "Select a customer",
          path: ["customerId"],
        });
      }
    } else {
      if (!data.newName?.trim()) {
        ctx.addIssue({
          code: "custom",
          message: "Customer name required",
          path: ["newName"],
        });
      }
    }
  });

type FormValues = z.infer<typeof formSchema>;

function todayISO() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function addDaysISO(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

type SearchHit = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  gstNumber: string | null;
};

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

export function InvoiceCreateForm({
  defaultInvoiceNumber,
}: {
  defaultInvoiceNumber: string;
}) {
  const router = useRouter();
  const [searchQ, setSearchQ] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as Resolver<FormValues>,
    defaultValues: {
      customerMode: "existing",
      customerId: "",
      newName: "",
      newEmail: "",
      newPhone: "",
      newAddress: "",
      newGst: "",
      issueDate: todayISO(),
      dueDate: addDaysISO(30),
      lines: [
        { productName: "", quantity: 1, unitPrice: 0, taxRate: 18 },
      ],
      discountMode: "flat",
      discountValue: 0,
      notes: "",
      customerNotes: "",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "lines",
  });

  const linesWatch = useWatch({ control: form.control, name: "lines" });
  const discountMode = useWatch({ control: form.control, name: "discountMode" });
  const discountValue = useWatch({ control: form.control, name: "discountValue" });

  const totals = useMemo(() => {
    const drafts = (linesWatch ?? []).map((l) => ({
      productName: l.productName ?? "",
      quantity: Number(l.quantity) || 0,
      unitPrice: Number(l.unitPrice) || 0,
      taxRate: (l.taxRate ?? 18) as (typeof GST_RATES)[number],
    }));
    return computeInvoiceLines(drafts, discountMode, Number(discountValue) || 0);
  }, [linesWatch, discountMode, discountValue]);

  const fetchCustomers = useCallback(async (q: string) => {
    const res = await fetch(
      `/api/customers/search?q=${encodeURIComponent(q)}`,
    );
    if (!res.ok) return;
    const data = (await res.json()) as { customers: SearchHit[] };
    setHits(data.customers);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      void fetchCustomers(searchQ);
    }, 250);
    return () => clearTimeout(t);
  }, [searchQ, fetchCustomers]);

  const customerMode = useWatch({ control: form.control, name: "customerMode" });
  const selectedId = useWatch({ control: form.control, name: "customerId" });
  const selectedCustomer = hits.find((h) => h.id === selectedId);

  async function onSubmit(values: FormValues) {
    setSubmitError(null);
    const body: Record<string, unknown> = {
      issueDate: values.issueDate,
      dueDate: values.dueDate,
      lines: values.lines.map((l) => ({
        productName: l.productName.trim(),
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        taxRate: l.taxRate,
      })),
      discountMode: values.discountMode,
      discountValue: values.discountValue,
      notes: values.notes?.trim() || null,
      customerNotes: values.customerNotes?.trim() || null,
    };

    if (values.customerMode === "existing") {
      body.customerId = values.customerId;
    } else {
      body.newCustomer = {
        name: values.newName!.trim(),
        email: values.newEmail?.trim() || null,
        phone: values.newPhone?.trim() || null,
        address: values.newAddress?.trim() || null,
        gstNumber: values.newGst?.trim() || null,
      };
    }

    const res = await fetch("/api/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const json = (await res.json().catch(() => ({}))) as {
      error?: unknown;
      invoice?: { id: string };
    };

    if (!res.ok) {
      setSubmitError(
        typeof json.error === "string"
          ? json.error
          : "Could not create invoice. Check the form and try again.",
      );
      return;
    }

    if (json.invoice?.id) {
      router.push(`/invoices/${json.invoice.id}`);
      router.refresh();
    }
  }

  return (
    <form
      onSubmit={form.handleSubmit((v) => void onSubmit(v))}
      className="space-y-8"
    >
      <div className="grid gap-6 lg:grid-cols-2">
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
                {...form.register("issueDate")}
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
                {...form.register("dueDate")}
              />
            </div>
          </div>
        </div>

        <div className="space-y-4 rounded-xl border border-border bg-card p-5 shadow-sm">
          <h2 className="text-sm font-medium">Customer</h2>
          <div className="flex gap-2">
            <button
              type="button"
              className={cn(
                buttonVariants({
                  variant: customerMode === "existing" ? "default" : "outline",
                  size: "sm",
                }),
              )}
              onClick={() => form.setValue("customerMode", "existing")}
            >
              Existing
            </button>
            <button
              type="button"
              className={cn(
                buttonVariants({
                  variant: customerMode === "new" ? "default" : "outline",
                  size: "sm",
                }),
              )}
              onClick={() => {
                form.setValue("customerMode", "new");
                form.setValue("customerId", "");
              }}
            >
              New customer
            </button>
          </div>

          {customerMode === "existing" ? (
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
          ) : (
            <div className="grid gap-3">
              <div>
                <label className="text-xs font-medium">Name *</label>
                <input
                  className="mt-1 h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
                  {...form.register("newName")}
                />
                {form.formState.errors.newName ? (
                  <p className="mt-1 text-xs text-destructive">
                    {form.formState.errors.newName.message}
                  </p>
                ) : null}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-medium">Email</label>
                  <input
                    type="email"
                    className="mt-1 h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
                    {...form.register("newEmail")}
                />
                </div>
                <div>
                  <label className="text-xs font-medium">Phone</label>
                  <input
                    className="mt-1 h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
                    {...form.register("newPhone")}
                />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium">Address</label>
                <textarea
                  rows={2}
                  className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  {...form.register("newAddress")}
                />
              </div>
              <div>
                <label className="text-xs font-medium">GSTIN</label>
                <input
                  className="mt-1 h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
                  {...form.register("newGst")}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-medium">Line items</h2>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              append({ productName: "", quantity: 1, unitPrice: 0, taxRate: 18 })
            }
          >
            <Plus className="size-4" aria-hidden />
            Add line
          </Button>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="pb-2 pr-2 font-medium">Product</th>
                <th className="pb-2 pr-2 font-medium">Qty</th>
                <th className="pb-2 pr-2 font-medium">Unit (₹)</th>
                <th className="pb-2 pr-2 font-medium">GST %</th>
                <th className="pb-2 pr-2 text-right font-medium">Tax</th>
                <th className="pb-2 pl-2 text-right font-medium">Line</th>
                <th className="w-10 pb-2" />
              </tr>
            </thead>
            <tbody>
              {fields.map((field, index) => {
                const row = totals.items[index];
                return (
                  <tr key={field.id} className="border-b border-border/80">
                    <td className="py-2 pr-2 align-top">
                      <input
                        className="h-9 w-full min-w-[140px] rounded-lg border border-input bg-background px-2 text-sm"
                        placeholder="Description"
                        {...form.register(`lines.${index}.productName`)}
                      />
                    </td>
                    <td className="py-2 pr-2 align-top">
                      <input
                        type="number"
                        step="0.01"
                        min={0.01}
                        className="h-9 w-20 rounded-lg border border-input bg-background px-2 text-sm tabular-nums"
                        {...form.register(`lines.${index}.quantity`, {
                          valueAsNumber: true,
                        })}
                      />
                    </td>
                    <td className="py-2 pr-2 align-top">
                      <input
                        type="number"
                        step="0.01"
                        min={0}
                        className="h-9 w-24 rounded-lg border border-input bg-background px-2 text-sm tabular-nums"
                        {...form.register(`lines.${index}.unitPrice`, {
                          valueAsNumber: true,
                        })}
                      />
                    </td>
                    <td className="py-2 pr-2 align-top">
                      <select
                        className="h-9 rounded-lg border border-input bg-background px-2 text-sm"
                        {...form.register(`lines.${index}.taxRate`, {
                          valueAsNumber: true,
                        })}
                      >
                        {GST_RATES.map((r) => (
                          <option key={r} value={r}>
                            {r}%
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2 pr-2 text-right align-top tabular-nums text-muted-foreground">
                      {row ? inr.format(row.taxAmount) : "—"}
                    </td>
                    <td className="py-2 pl-2 text-right align-top tabular-nums font-medium">
                      {row ? inr.format(row.lineTotal) : "—"}
                    </td>
                    <td className="py-2 align-top">
                      {fields.length > 1 ? (
                        <Button
                          type="button"
                          size="icon-xs"
                          variant="ghost"
                          aria-label="Remove line"
                          onClick={() => remove(index)}
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-6 grid gap-4 border-t border-border pt-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">
              Discount
            </label>
            <div className="mt-1 flex gap-2">
              <select
                className="h-9 rounded-lg border border-input bg-background px-2 text-sm"
                {...form.register("discountMode")}
              >
                <option value="flat">Flat ₹</option>
                <option value="percent">Percent %</option>
              </select>
              <input
                type="number"
                step="0.01"
                min={0}
                className="h-9 w-full rounded-lg border border-input bg-background px-2 text-sm tabular-nums"
                {...form.register("discountValue", { valueAsNumber: true })}
              />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Applied to pre-tax subtotal before GST is recalculated.
            </p>
          </div>
          <div className="sm:col-span-2 lg:col-span-2">
            <dl className="grid max-w-sm grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <dt className="text-muted-foreground">Subtotal (pre-discount)</dt>
              <dd className="text-right tabular-nums">
                {inr.format(totals.preDiscountSubtotal)}
              </dd>
              <dt className="text-muted-foreground">Discount</dt>
              <dd className="text-right tabular-nums">
                − {inr.format(totals.discountAmount)}
              </dd>
              <dt className="text-muted-foreground">Taxable (after discount)</dt>
              <dd className="text-right tabular-nums font-medium">
                {inr.format(totals.subtotal)}
              </dd>
              <dt className="text-muted-foreground">Total GST</dt>
              <dd className="text-right tabular-nums">
                {inr.format(totals.taxAmount)}
              </dd>
              <dt className="font-medium">Total</dt>
              <dd className="text-right text-lg font-semibold tabular-nums">
                {inr.format(totals.totalAmount)}
              </dd>
            </dl>
          </div>
        </div>
      </div>

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
            {...form.register("notes")}
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
            {...form.register("customerNotes")}
          />
        </div>
      </div>

      {submitError ? (
        <p className="text-sm text-destructive" role="alert">
          {submitError}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Saving…" : "Save draft"}
        </Button>
        <Link
          href="/invoices"
          className={cn(buttonVariants({ variant: "outline", size: "default" }))}
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
