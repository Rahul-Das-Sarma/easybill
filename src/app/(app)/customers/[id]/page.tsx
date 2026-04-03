import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn, invoiceStatusTextClass } from "@/lib/utils";
import { effectiveInvoiceStatus } from "@/lib/invoice-payment-status";
import { ensureAppUser, getSessionUser } from "@/lib/auth-user";
import { prisma } from "@/lib/prisma";

type Props = { params: Promise<{ id: string }> };

export default async function CustomerDetailPage({ params }: Props) {
  const { id } = await params;
  if (!id) {
    notFound();
  }

  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }
  await ensureAppUser(user);

  const customer = await prisma.customer.findFirst({
    where: { id, userId: user.id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      address: true,
      gstNumber: true,
    },
  });

  if (!customer) {
    notFound();
  }

  const invoices = await prisma.invoice.findMany({
    where: { customerId: id, userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
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
    },
  });

  const inr = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  });

  return (
    <>
      <PageHeader
        title="Customer"
        description={`${customer.name} · Invoice history (latest 20)`}
        actions={
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href="/customers"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              All customers
            </Link>
            <Link
              href="/invoices/create"
              className={cn(buttonVariants({ variant: "default", size: "sm" }))}
            >
              New invoice
            </Link>
          </div>
        }
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm lg:col-span-1">
          <h2 className="text-sm font-medium">Details</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Name</dt>
              <dd className="font-medium">{customer.name}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Email</dt>
              <dd className="text-right">{customer.email ?? "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Phone</dt>
              <dd className="text-right">{customer.phone ?? "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Address</dt>
              <dd className="text-right">{customer.address ?? "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">GSTIN</dt>
              <dd className="text-right">{customer.gstNumber ?? "—"}</dd>
            </div>
          </dl>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm lg:col-span-2">
          <h2 className="text-sm font-medium">Invoice history</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {invoices.length > 0
              ? `Showing ${invoices.length} most recent invoices.`
              : "No invoices yet for this customer."}
          </p>
          {invoices.length === 0 ? (
            <div className="mt-6 rounded-lg border border-border/70 bg-muted/20 p-6 text-center text-sm text-muted-foreground">
              Create an invoice to start billing this customer.
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-left text-xs font-medium text-muted-foreground">
                    <th className="px-4 py-3">Invoice</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Total</th>
                    <th className="px-4 py-3 text-right">Paid</th>
                    <th className="px-4 py-3 text-right">Due</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => {
                    const displayStatus = effectiveInvoiceStatus(
                      inv.dueDate,
                      inv.status,
                      inv.amountPaid,
                    );
                    const outstanding =
                      Number(inv.totalAmount.toString()) -
                      Number(inv.amountPaid.toString());
                    return (
                      <tr key={inv.id} className="border-b border-border/80">
                        <td className="px-4 py-2 font-medium">
                          {inv.invoiceNumber}
                          <div className="text-xs text-muted-foreground">
                            Issued {inv.issueDate.toISOString().slice(0, 10)}
                          </div>
                        </td>
                        <td className="px-4 py-2 text-muted-foreground">
                          <span
                            className={cn(
                              "capitalize",
                              invoiceStatusTextClass(displayStatus),
                            )}
                          >
                            {displayStatus.replaceAll("_", " ")}
                          </span>
                          {outstanding > 0.004 ? (
                            <div className="mt-1 text-xs">
                              Outstanding{" "}
                              <span className="tabular-nums font-medium">
                                {inr.format(Math.max(0, outstanding))}
                              </span>
                            </div>
                          ) : null}
                        </td>
                        <td className="px-4 py-2 text-right tabular-nums">
                          {inr.format(Number(inv.totalAmount.toString()))}
                        </td>
                        <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">
                          {inr.format(Number(inv.amountPaid.toString()))}
                        </td>
                        <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">
                          {inv.dueDate.toISOString().slice(0, 10)}
                        </td>
                        <td className="px-4 py-2 text-right">
                          <Link
                            href={`/invoices/${inv.id}`}
                            className={cn(
                              buttonVariants({ variant: "ghost", size: "xs" }),
                              "text-muted-foreground",
                            )}
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
