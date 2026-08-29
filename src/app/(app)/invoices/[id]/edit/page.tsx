import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { InvoiceCreateForm } from "@/components/invoices/invoice-create-form";
import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button-variants";
import { ensureAppUser, getSessionUser } from "@/lib/auth-user";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

type Props = { params: Promise<{ id: string }> };

export default async function EditInvoicePage({ params }: Props) {
  const { id } = await params;
  if (!id) {
    notFound();
  }

  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }
  await ensureAppUser(user);

  const [invoice, gstRow] = await Promise.all([
    prisma.invoice.findFirst({
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
    }),
    prisma.user.findUnique({
      where: { id: user.id },
      select: { gstScheme: true, stateCode: true, gstNumber: true },
    }),
  ]);

  if (!invoice) {
    notFound();
  }

  if (invoice.status !== "draft") {
    redirect(`/invoices/${id}`);
  }

  if (Number(invoice.amountPaid.toString()) > 0) {
    redirect(`/invoices/${id}`);
  }

  const gstProfile = {
    gstScheme: (gstRow?.gstScheme ?? "regular") as
      | "regular"
      | "composition"
      | "unregistered",
    stateCode: gstRow?.stateCode ?? null,
    gstNumber: gstRow?.gstNumber ?? null,
  };

  const discountAmount = Number(invoice.discountAmount.toString());

  return (
    <>
      <PageHeader
        title="Edit invoice"
        description={`${invoice.invoiceNumber} · Draft`}
        actions={
          <Link
            href={`/invoices/${id}`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Back to invoice
          </Link>
        }
      />
      <InvoiceCreateForm
        mode="edit"
        invoiceId={invoice.id}
        defaultInvoiceNumber={invoice.invoiceNumber}
        gstProfile={gstProfile}
        initialCustomer={invoice.customer}
        initialValues={{
          customerId: invoice.customerId,
          issueDate: invoice.issueDate.toISOString().slice(0, 10),
          dueDate: invoice.dueDate.toISOString().slice(0, 10),
          lines: invoice.items.map((it) => ({
            productName: it.productName,
            quantity: Number(it.quantity),
            unitPrice: Number(it.unitPrice),
            taxRate: Number(it.taxRate) as 0 | 5 | 12 | 18 | 28,
          })),
          discountMode: "flat",
          discountValue: discountAmount,
          notes: invoice.notes ?? "",
          customerNotes: invoice.customerNotes ?? "",
        }}
      />
    </>
  );
}
