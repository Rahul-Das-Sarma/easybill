import { Prisma } from "@/generated/prisma/client";
import { NextResponse } from "next/server";

import { ensureAppUser, getSessionUser } from "@/lib/auth-user";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(_req: Request, { params }: Params) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureAppUser(user);

  const { id } = await params;

  const invoice = await prisma.invoice.findFirst({
    where: { id, userId: user.id },
  });

  if (!invoice) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const total = new Prisma.Decimal(invoice.totalAmount.toString());
  const paid = new Prisma.Decimal(invoice.amountPaid.toString());
  const remaining = total.minus(paid);

  if (invoice.status === "paid" && paid.greaterThanOrEqualTo(total)) {
    return NextResponse.json({ ok: true });
  }

  await prisma.$transaction(async (tx) => {
    if (remaining.greaterThan(0)) {
      await tx.payment.create({
        data: {
          invoiceId: id,
          amount: remaining,
          paymentDate: new Date(),
          method: "upi",
          notes: "Marked as fully paid",
        },
      });
    }

    await tx.invoice.update({
      where: { id },
      data: {
        status: "paid",
        amountPaid: total,
      },
    });
  });

  return NextResponse.json({ ok: true });
}
