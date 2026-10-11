import { NextResponse } from "next/server";

import { ensureAppUser, getSessionUser } from "@/lib/auth-user";
import {
  buildInvoiceTotals,
  invoiceItemCreates,
  invoiceTotalsData,
} from "@/lib/invoice-mutation";
import { invoiceMutationBodySchema } from "@/lib/invoice-mutation-schema";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await ensureAppUser(user);

  const { id } = await params;
  const invoice = await prisma.invoice.findFirst({
    where: { id, userId: user.id },
    include: {
      customer: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          gstNumber: true,
          stateCode: true,
        },
      },
      items: { orderBy: { sortOrder: "asc" } },
    },
  });

  if (!invoice) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    invoice: {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      status: invoice.status,
      customerId: invoice.customerId,
      issueDate: invoice.issueDate.toISOString().slice(0, 10),
      dueDate: invoice.dueDate.toISOString().slice(0, 10),
      discountAmount: invoice.discountAmount.toString(),
      notes: invoice.notes,
      customerNotes: invoice.customerNotes,
      amountPaid: invoice.amountPaid.toString(),
      customer: invoice.customer,
      lines: invoice.items.map((it) => ({
        productName: it.productName,
        quantity: Number(it.quantity),
        unitPrice: Number(it.unitPrice),
        taxRate: Number(it.taxRate),
      })),
    },
  });
}

export async function PATCH(req: Request, { params }: Params) {
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

  const parsed = invoiceMutationBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const existing = await prisma.invoice.findFirst({
    where: { id, userId: user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (existing.status !== "draft") {
    return NextResponse.json(
      { error: "Only draft invoices can be edited" },
      { status: 400 },
    );
  }
  if (Number(existing.amountPaid.toString()) > 0) {
    return NextResponse.json(
      { error: "Cannot edit an invoice with payments recorded" },
      { status: 400 },
    );
  }

  const built = await buildInvoiceTotals(user.id, parsed.data);
  if ("error" in built) {
    if (built.error === "FORBIDDEN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json(
      { error: "Add at least one line item with quantity and price" },
      { status: 400 },
    );
  }

  const { breakdown, gstScheme, supplyType } = built;
  const items = invoiceItemCreates(breakdown.items).map((item, index) => ({
    ...item,
    hsnCode: parsed.data.lines[index]?.hsnCode?.trim() || null,
  }));
  const totals = invoiceTotalsData(breakdown, gstScheme, supplyType);

  const updated = await prisma.$transaction(async (tx) => {
    await tx.invoiceItem.deleteMany({ where: { invoiceId: id } });
    return tx.invoice.update({
      where: { id },
      data: {
        customerId: parsed.data.customerId,
        issueDate: new Date(`${parsed.data.issueDate}T12:00:00.000Z`),
        dueDate: new Date(`${parsed.data.dueDate}T12:00:00.000Z`),
        notes: parsed.data.notes?.trim() || null,
        customerNotes: parsed.data.customerNotes?.trim() || null,
        ...totals,
        items: { create: items },
      },
      select: { id: true, invoiceNumber: true },
    });
  });

  return NextResponse.json({ invoice: updated });
}

export async function DELETE(_req: Request, { params }: Params) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await ensureAppUser(user);

  const { id } = await params;
  const existing = await prisma.invoice.findFirst({
    where: { id, userId: user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (existing.status !== "draft") {
    return NextResponse.json(
      { error: "Only draft invoices can be deleted" },
      { status: 400 },
    );
  }
  if (Number(existing.amountPaid.toString()) > 0) {
    return NextResponse.json(
      { error: "Cannot delete an invoice with payments recorded" },
      { status: 400 },
    );
  }

  await prisma.invoice.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
