import { NextResponse } from "next/server";

import { ensureAppUser, getSessionUser } from "@/lib/auth-user";
import { buildGstr1 } from "@/lib/compliance/gstr1";
import { prisma } from "@/lib/prisma";

function num(value: { toString(): string }) {
  return Number(value.toString());
}

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await ensureAppUser(user);

  const month = new URL(req.url).searchParams.get("month") ?? "";
  if (!/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: "Use month=YYYY-MM" }, { status: 400 });
  }

  const seller = await prisma.user.findUnique({
    where: { id: user.id },
    select: { gstNumber: true },
  });
  if (!seller?.gstNumber) {
    return NextResponse.json(
      { error: "Add your GSTIN in Settings before preparing GSTR-1." },
      { status: 400 },
    );
  }

  const start = new Date(`${month}-01T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCMonth(end.getUTCMonth() + 1);

  const invoices = await prisma.invoice.findMany({
    where: {
      userId: user.id,
      status: { not: "draft" },
      issueDate: { gte: start, lt: end },
    },
    include: {
      customer: { select: { gstNumber: true, stateCode: true } },
      items: true,
    },
    orderBy: { issueDate: "asc" },
  });

  const payload = buildGstr1({
    gstin: seller.gstNumber.toUpperCase(),
    month,
    invoices: invoices.map((invoice) => ({
      invoiceNumber: invoice.invoiceNumber,
      issueDate: invoice.issueDate.toISOString().slice(0, 10),
      buyerGstin: invoice.customer.gstNumber,
      placeOfSupply:
        invoice.customer.stateCode ??
        invoice.customer.gstNumber?.slice(0, 2) ??
        null,
      totalAmount: num(invoice.totalAmount),
      lines: invoice.items.map((item) => ({
        taxRate: num(item.taxRate),
        taxableValue: num(item.quantity) * num(item.unitPrice),
        cgstAmount: num(item.cgstAmount),
        sgstAmount: num(item.sgstAmount),
        igstAmount: num(item.igstAmount),
      })),
    })),
  });

  return NextResponse.json({
    month,
    invoiceCount: invoices.length,
    b2bCount: payload.b2b.reduce((sum, row) => sum + row.inv.length, 0),
    payload,
  });
}
