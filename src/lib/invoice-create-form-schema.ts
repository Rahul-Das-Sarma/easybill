import { z } from "zod";

import { coerceNumberInput } from "@/lib/number-input";

const gstRateSchema = z.union([
  z.literal(0),
  z.literal(5),
  z.literal(12),
  z.literal(18),
  z.literal(28),
]);

export const invoiceLineSchema = z.object({
  productName: z.string(),
  hsnCode: z.string().max(8).optional(),
  quantity: z.preprocess(
    (v) => coerceNumberInput(v),
    z.number().positive(),
  ),
  unitPrice: z.preprocess(
    (v) => coerceNumberInput(v),
    z.number().min(0),
  ),
  taxRate: z.preprocess(
    (v) => (typeof v === "string" ? Number(v) : v),
    gstRateSchema,
  ),
});

export const invoiceCreateFormSchema = z
  .object({
    customerId: z.string().optional(),
    issueDate: z.string().min(1),
    dueDate: z.string().min(1),
    lines: z.array(invoiceLineSchema).min(1),
    discountMode: z.enum(["flat", "percent"]),
    discountValue: z.preprocess(
      (v) => coerceNumberInput(v),
      z.number().min(0),
    ),
    notes: z.string().optional(),
    customerNotes: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const uuid = z.string().uuid().safeParse(data.customerId);
    if (!uuid.success) {
      ctx.addIssue({
        code: "custom",
        message: "Select a customer",
        path: ["customerId"],
      });
    }
  });

export type InvoiceCreateFormValues = z.infer<typeof invoiceCreateFormSchema>;
