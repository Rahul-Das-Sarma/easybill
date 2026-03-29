import { InvoiceStatus, Prisma } from "@/generated/prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { ensureAppUser, getSessionUser } from "@/lib/auth-user";
import { utcStartOfToday } from "@/lib/invoice-payment-status";
import { prisma } from "@/lib/prisma";

const paymentMethodSchema = z.enum([
  "cash",
  "upi",
  "bank_transfer",
  "card",
  "cheque",
  "other",
]);

const bodySchema = z.object({
  amount: z.coerce.number().positive(),
  paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  method: paymentMethodSchema,
  reference: z.string().max(200).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

type Params = { params: Promise<{ id: string }> };

function nextStatusAfterPayment(
  total: Prisma.Decimal,
  newPaid: Prisma.Decimal,
  dueDate: Date,
): InvoiceStatus {
  if (newPaid.greaterThanOrEqualTo(total)) return InvoiceStatus.paid;
  if (dueDate < utcStartOfToday()) return InvoiceStatus.overdue;
  return InvoiceStatus.partial;
}

export async function POST(req: Request, { params }: Params) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureAppUser(user);

  const { id } = await params;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const body = parsed.data;

  const invoice = await prisma.invoice.findFirst({
    where: { id, userId: user.id },
  });

  if (!invoice) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (invoice.status === "paid") {
    return NextResponse.json(
      { error: "Invoice is already fully paid" },
      { status: 400 },
    );
  }

  const total = new Prisma.Decimal(invoice.totalAmount.toString());
  const paid = new Prisma.Decimal(invoice.amountPaid.toString());
  const remaining = total.minus(paid);

  const amountDec = new Prisma.Decimal(body.amount.toFixed(2));
  if (amountDec.greaterThan(remaining)) {
    return NextResponse.json(
      {
        error: `Amount exceeds outstanding balance (${remaining.toFixed(2)} ${invoice.currency})`,
      },
      { status: 400 },
    );
  }

  const paymentDate = new Date(`${body.paymentDate}T12:00:00.000Z`);
  const newPaid = paid.plus(amountDec);
  const status = nextStatusAfterPayment(total, newPaid, invoice.dueDate);

  await prisma.$transaction(async (tx) => {
    await tx.payment.create({
      data: {
        invoiceId: id,
        amount: amountDec,
        paymentDate,
        method: body.method,
        reference: body.reference?.trim() || null,
        notes: body.notes?.trim() || null,
      },
    });

    await tx.invoice.update({
      where: { id },
      data: {
        amountPaid: newPaid,
        status,
      },
    });
  });

  return NextResponse.json({ ok: true });
}
