import { prisma } from "@/lib/prisma";

import type { InvoicePdfPayload } from "./types";

export async function loadInvoicePdfPayload(
  invoiceId: string,
  userId: string,
): Promise<InvoicePdfPayload | null> {
  const inv = await prisma.invoice.findFirst({
    where: { id: invoiceId, userId },
    include: {
      customer: true,
      user: true,
      items: { orderBy: { sortOrder: "asc" } },
    },
  });

  if (!inv) return null;

  const u = inv.user;
  const c = inv.customer;

  return {
    plan: u.plan === "pro" ? "pro" : "free",
    business: {
      name: u.name,
      companyName: u.companyName,
      email: u.email,
      address: u.address,
      phone: u.phone,
      gstNumber: u.gstNumber,
      logoUrl: u.companyLogoUrl,
    },
    customer: {
      name: c.name,
      email: c.email,
      address: c.address,
      gstNumber: c.gstNumber,
      phone: c.phone,
    },
    invoice: {
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      status: inv.status,
      issueDate: inv.issueDate.toISOString().slice(0, 10),
      dueDate: inv.dueDate.toISOString().slice(0, 10),
      customerNotes: inv.customerNotes,
      subtotal: inv.subtotal.toString(),
      discountAmount: inv.discountAmount.toString(),
      taxAmount: inv.taxAmount.toString(),
      totalAmount: inv.totalAmount.toString(),
      amountPaid: inv.amountPaid.toString(),
      currency: inv.currency,
    },
    items: inv.items.map((it) => ({
      productName: it.productName,
      quantity: it.quantity.toString(),
      unitPrice: it.unitPrice.toString(),
      taxRate: it.taxRate.toString(),
      taxAmount: it.taxAmount.toString(),
      total: it.total.toString(),
      sortOrder: it.sortOrder,
    })),
  };
}
