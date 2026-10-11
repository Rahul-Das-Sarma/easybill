import { z } from "zod";

export const invoiceLineBodySchema = z.object({
  productName: z.string().min(1),
  hsnCode: z.string().max(8).optional().nullable(),
  quantity: z.coerce.number().positive(),
  unitPrice: z.coerce.number().min(0),
  taxRate: z.union([
    z.literal(0),
    z.literal(5),
    z.literal(12),
    z.literal(18),
    z.literal(28),
  ]),
});

export const invoiceMutationBodySchema = z.object({
  customerId: z.string().uuid(),
  issueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  lines: z.array(invoiceLineBodySchema).min(1),
  discountMode: z.enum(["flat", "percent"]),
  discountValue: z.coerce.number().min(0),
  notes: z.string().optional().nullable(),
  customerNotes: z.string().optional().nullable(),
});

export type InvoiceMutationBody = z.infer<typeof invoiceMutationBodySchema>;
