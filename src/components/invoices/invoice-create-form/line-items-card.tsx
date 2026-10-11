"use client";

import type { FieldArrayWithId, UseFormRegister } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { NumberInput } from "@/components/ui/number-input";
import { formatInr } from "@/lib/format-inr";
import { COMPOSITION_DISCLAIMER } from "@/lib/gst-india";
import { computeInvoiceLines } from "@/lib/invoice-math";
import type { InvoiceCreateFormValues } from "@/lib/invoice-create-form-schema";
import { Trash2 } from "lucide-react";

import type { InvoiceGstProfile } from "./types";

type Totals = ReturnType<typeof computeInvoiceLines>;

type Props = {
  fields: FieldArrayWithId<InvoiceCreateFormValues, "lines", "id">[];
  register: UseFormRegister<InvoiceCreateFormValues>;
  remove: (index: number) => void;
  totals: Totals;
  gstProfile: InvoiceGstProfile;
};

export function InvoiceLineItemsCard({
  fields,
  register,
  remove,
  totals,
  gstProfile,
}: Props) {
  const showGst = gstProfile.gstScheme === "regular";
  const isInter = totals.supplyType === "inter";

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div>
        <h2 className="text-sm font-medium">Line items</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {gstProfile.gstScheme === "composition"
            ? "Composition scheme — taxable value only, no GST collected."
            : gstProfile.gstScheme === "unregistered"
              ? "Unregistered — simple bill without GST."
              : isInter
                ? "Inter-state supply — IGST applies."
                : "Intra-state supply — CGST + SGST applies."}
        </p>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="pb-2 pr-2 font-medium">Product</th>
              <th className="pb-2 pr-2 font-medium">Qty</th>
              <th className="pb-2 pr-2 font-medium">Unit (₹)</th>
              {showGst ? (
                <th className="pb-2 pr-2 font-medium">GST %</th>
              ) : null}
              {showGst && !isInter ? (
                <>
                  <th className="pb-2 pr-2 text-right font-medium">CGST</th>
                  <th className="pb-2 pr-2 text-right font-medium">SGST</th>
                </>
              ) : null}
              {showGst && isInter ? (
                <th className="pb-2 pr-2 text-right font-medium">IGST</th>
              ) : null}
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
                      className="h-9 w-full min-w-[160px] rounded-lg border border-input bg-background px-2 text-sm"
                      placeholder="Product or service"
                      autoComplete="off"
                      {...register(`lines.${index}.productName`)}
                    />
                    <input
                      className="mt-1 h-8 w-full min-w-[160px] rounded-lg border border-input bg-background px-2 text-xs"
                      placeholder="HSN"
                      inputMode="numeric"
                      autoComplete="off"
                      {...register(`lines.${index}.hsnCode`)}
                    />
                  </td>
                  <td className="py-2 pr-2 align-top">
                    <NumberInput
                      step="0.01"
                      min={0.01}
                      className="h-9 w-20 rounded-lg border border-input bg-background px-2 text-sm tabular-nums"
                      {...register(`lines.${index}.quantity`, {
                        valueAsNumber: true,
                      })}
                    />
                  </td>
                  <td className="py-2 pr-2 align-top">
                    <NumberInput
                      step="0.01"
                      min={0}
                      className="h-9 w-24 rounded-lg border border-input bg-background px-2 text-sm tabular-nums"
                      {...register(`lines.${index}.unitPrice`, {
                        valueAsNumber: true,
                      })}
                    />
                  </td>
                  {showGst ? (
                    <td className="py-2 pr-2 align-top">
                      <select
                        className="h-9 rounded-lg border border-input bg-background px-2 text-sm"
                        {...register(`lines.${index}.taxRate`, {
                          valueAsNumber: true,
                        })}
                      >
                        {[0, 5, 12, 18, 28].map((r) => (
                          <option key={r} value={r}>
                            {r}%
                          </option>
                        ))}
                      </select>
                    </td>
                  ) : null}
                  {showGst && !isInter ? (
                    <>
                      <td className="py-2 pr-2 text-right align-top tabular-nums text-muted-foreground">
                        {row ? formatInr.format(row.cgstAmount) : "—"}
                      </td>
                      <td className="py-2 pr-2 text-right align-top tabular-nums text-muted-foreground">
                        {row ? formatInr.format(row.sgstAmount) : "—"}
                      </td>
                    </>
                  ) : null}
                  {showGst && isInter ? (
                    <td className="py-2 pr-2 text-right align-top tabular-nums text-muted-foreground">
                      {row ? formatInr.format(row.igstAmount) : "—"}
                    </td>
                  ) : null}
                  <td className="py-2 pl-2 text-right align-top tabular-nums font-medium">
                    {row ? formatInr.format(row.lineTotal) : "—"}
                  </td>
                  <td className="py-2 align-top">
                    <Button
                      type="button"
                      size="icon-xs"
                      variant="ghost"
                      aria-label="Remove line"
                      onClick={() => remove(index)}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
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
              {...register("discountMode")}
            >
              <option value="flat">Flat ₹</option>
              <option value="percent">Percent %</option>
            </select>
            <NumberInput
              step="0.01"
              min={0}
              className="h-9 w-full rounded-lg border border-input bg-background px-2 text-sm tabular-nums"
              {...register("discountValue", { valueAsNumber: true })}
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
              {formatInr.format(totals.preDiscountSubtotal)}
            </dd>
            <dt className="text-muted-foreground">Discount</dt>
            <dd className="text-right tabular-nums">
              − {formatInr.format(totals.discountAmount)}
            </dd>
            <dt className="text-muted-foreground">Taxable (after discount)</dt>
            <dd className="text-right tabular-nums font-medium">
              {formatInr.format(totals.subtotal)}
            </dd>
            {showGst && !isInter ? (
              <>
                <dt className="text-muted-foreground">CGST</dt>
                <dd className="text-right tabular-nums">
                  {formatInr.format(totals.cgstAmount)}
                </dd>
                <dt className="text-muted-foreground">SGST</dt>
                <dd className="text-right tabular-nums">
                  {formatInr.format(totals.sgstAmount)}
                </dd>
              </>
            ) : null}
            {showGst && isInter ? (
              <>
                <dt className="text-muted-foreground">IGST</dt>
                <dd className="text-right tabular-nums">
                  {formatInr.format(totals.igstAmount)}
                </dd>
              </>
            ) : null}
            {showGst ? (
              <>
                <dt className="text-muted-foreground">Total GST</dt>
                <dd className="text-right tabular-nums">
                  {formatInr.format(totals.taxAmount)}
                </dd>
              </>
            ) : null}
            <dt className="font-medium">Total</dt>
            <dd className="text-right text-lg font-semibold tabular-nums">
              {formatInr.format(totals.totalAmount)}
            </dd>
          </dl>
          {gstProfile.gstScheme === "composition" ? (
            <p className="mt-3 max-w-sm text-xs text-muted-foreground">
              {COMPOSITION_DISCLAIMER}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
