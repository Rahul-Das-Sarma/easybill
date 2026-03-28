import { Prisma } from "@/generated/prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { ensureAppUser, getSessionUser } from "@/lib/auth-user";
import { computeInvoiceLines } from "@/lib/invoice-math";
import { getNextInvoiceNumber } from "@/lib/next-invoice-number";
import { prisma } from "@/lib/prisma";

const lineSchema = z.object({
  productName: z.string().min(1),
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

const createBodySchema = z
  .object({
    customerId: z.preprocess(
      (val) =>
        val === null || val === undefined || val === ""
          ? undefined
          : val,
      z.string().uuid().optional(),
    ),
    newCustomer: z
      .object({
        name: z.string().min(1),
        email: z.string().email().optional().nullable(),
        phone: z.string().optional().nullable(),
        address: z.string().optional().nullable(),
        gstNumber: z.string().optional().nullable(),
      })
      .optional()
      .nullable(),
    issueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    lines: z.array(lineSchema).min(1),
    discountMode: z.enum(["flat", "percent"]),
    discountValue: z.coerce.number().min(0),
    notes: z.string().optional().nullable(),
    customerNotes: z.string().optional().nullable(),
  })
  .refine(
    (d) => d.customerId || (d.newCustomer && d.newCustomer.name.trim().length > 0),
    { message: "Select a customer or create a new one" },
  );

function looksLikeAmount(q: string) {
  return /^\d+(\.\d{1,2})?$/.test(q);
}

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureAppUser(user);

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number.parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const limit = Math.min(
    50,
    Math.max(1, Number.parseInt(searchParams.get("limit") ?? "20", 10) || 20),
  );
  const q = (searchParams.get("q") ?? "").trim();
  const tab = searchParams.get("tab") ?? "all";

  const statusWhere: Prisma.InvoiceWhereInput = {};
  if (tab === "paid") {
    statusWhere.status = "paid";
  } else if (tab === "pending") {
    statusWhere.status = { in: ["draft", "pending", "partial"] };
  } else if (tab === "overdue") {
    statusWhere.status = "overdue";
  }

  const searchWhere: Prisma.InvoiceWhereInput =
    q.length === 0
      ? {}
      : {
          OR: [
            { invoiceNumber: { contains: q, mode: "insensitive" } },
            { customer: { name: { contains: q, mode: "insensitive" } } },
            ...(looksLikeAmount(q)
              ? [
                  {
                    totalAmount: {
                      equals: new Prisma.Decimal(q),
                    },
                  },
                ]
              : []),
          ],
        };

  const where: Prisma.InvoiceWhereInput = {
    userId: user.id,
    ...statusWhere,
    ...searchWhere,
  };

  const [total, rows] = await Promise.all([
    prisma.invoice.count({ where }),
    prisma.invoice.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        invoiceNumber: true,
        status: true,
        subtotal: true,
        discountAmount: true,
        taxAmount: true,
        totalAmount: true,
        amountPaid: true,
        currency: true,
        issueDate: true,
        dueDate: true,
        createdAt: true,
        customer: { select: { id: true, name: true } },
      },
    }),
  ]);

  const items = rows.map((r) => ({
    ...r,
    subtotal: r.subtotal.toString(),
    discountAmount: r.discountAmount.toString(),
    taxAmount: r.taxAmount.toString(),
    totalAmount: r.totalAmount.toString(),
    amountPaid: r.amountPaid.toString(),
    issueDate: r.issueDate.toISOString().slice(0, 10),
    dueDate: r.dueDate.toISOString().slice(0, 10),
    createdAt: r.createdAt.toISOString(),
  }));

  return NextResponse.json({
    items,
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureAppUser(user);

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const body = parsed.data;
  const breakdown = computeInvoiceLines(
    body.lines.map((l) => ({
      productName: l.productName.trim(),
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      taxRate: l.taxRate,
    })),
    body.discountMode,
    body.discountValue,
  );

  if (breakdown.preDiscountSubtotal <= 0) {
    return NextResponse.json(
      { error: "Add at least one line item with quantity and price" },
      { status: 400 },
    );
  }

  const { items: lineItems, subtotal, discountAmount, taxAmount, totalAmount } =
    breakdown;

  try {
    const invoice = await prisma.$transaction(async (tx) => {
      let customerId = body.customerId ?? null;

      if (body.newCustomer && !customerId) {
        const nc = body.newCustomer;
        const c = await tx.customer.create({
          data: {
            userId: user.id,
            name: nc.name.trim(),
            email: nc.email?.trim() || null,
            phone: nc.phone?.trim() || null,
            address: nc.address?.trim() || null,
            gstNumber: nc.gstNumber?.trim() || null,
          },
        });
        customerId = c.id;
      }

      if (!customerId) {
        throw new Error("Customer required");
      }

      const owned = await tx.customer.findFirst({
        where: { id: customerId, userId: user.id },
      });
      if (!owned) {
        throw new Error("FORBIDDEN");
      }

      const invoiceNumber = await getNextInvoiceNumber(user.id, tx);

      return tx.invoice.create({
        data: {
          userId: user.id,
          customerId,
          invoiceNumber,
          status: "draft",
          subtotal: new Prisma.Decimal(subtotal.toFixed(2)),
          discountAmount: new Prisma.Decimal(discountAmount.toFixed(2)),
          taxAmount: new Prisma.Decimal(taxAmount.toFixed(2)),
          totalAmount: new Prisma.Decimal(totalAmount.toFixed(2)),
          amountPaid: new Prisma.Decimal("0"),
          currency: "INR",
          issueDate: new Date(`${body.issueDate}T12:00:00.000Z`),
          dueDate: new Date(`${body.dueDate}T12:00:00.000Z`),
          notes: body.notes?.trim() || null,
          customerNotes: body.customerNotes?.trim() || null,
          items: {
            create: lineItems.map((row) => ({
              productName: row.productName.trim(),
              quantity: new Prisma.Decimal(row.quantity.toFixed(2)),
              unitPrice: new Prisma.Decimal(row.unitPrice.toFixed(2)),
              taxRate: new Prisma.Decimal(row.taxRate.toFixed(2)),
              taxAmount: new Prisma.Decimal(row.taxAmount.toFixed(2)),
              total: new Prisma.Decimal(row.lineTotal.toFixed(2)),
              sortOrder: row.sortOrder,
            })),
          },
        },
        select: {
          id: true,
          invoiceNumber: true,
          totalAmount: true,
        },
      });
    });

    return NextResponse.json({
      invoice: {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        totalAmount: invoice.totalAmount.toString(),
      },
    });
  } catch (e) {
    if (e instanceof Error && e.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    throw e;
  }
}
