import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { InvoiceDetailActions } from "@/components/invoices/invoice-detail-actions";
import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button-variants";
import { ensureAppUser, getSessionUser } from "@/lib/auth-user";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

type Props = { params: Promise<{ id: string }> };

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

export default async function InvoiceDetailPage({ params }: Props) {
  const { id } = await params;
  if (!id) {
    notFound();
  }

  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }
  await ensureAppUser(user);

  const invoice = await prisma.invoice.findFirst({
    where: { id, userId: user.id },
    include: {
      customer: true,
      items: { orderBy: { sortOrder: "asc" } },
      payments: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!invoice) {
    notFound();
  }

  const c = invoice.customer;

  return (
    <>
      <PageHeader
        title={invoice.invoiceNumber}
        description={`${c.name} · Due ${invoice.dueDate.toISOString().slice(0, 10)}`}
        actions={
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <InvoiceDetailActions
              invoiceId={invoice.id}
              invoiceNumber={invoice.invoiceNumber}
              customerEmail={c.email}
            />
            <Link
              href={`/invoices/${id}/edit`}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              Edit
            </Link>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <h2 className="text-sm font-medium">Line items</h2>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[520px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="pb-2 font-medium">Product</th>
                    <th className="pb-2 text-right font-medium">Qty</th>
                    <th className="pb-2 text-right font-medium">Rate</th>
                    <th className="pb-2 text-right font-medium">GST%</th>
                    <th className="pb-2 text-right font-medium">Tax</th>
                    <th className="pb-2 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.items.map((it) => (
                    <tr key={it.id} className="border-b border-border/80">
                      <td className="py-2 pr-2">{it.productName}</td>
                      <td className="py-2 text-right tabular-nums">
                        {it.quantity.toString()}
                      </td>
                      <td className="py-2 text-right tabular-nums">
                        {inr.format(Number(it.unitPrice))}
                      </td>
                      <td className="py-2 text-right tabular-nums">
                        {it.taxRate.toString()}%
                      </td>
                      <td className="py-2 text-right tabular-nums">
                        {inr.format(Number(it.taxAmount))}
                      </td>
                      <td className="py-2 text-right tabular-nums font-medium">
                        {inr.format(Number(it.total))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <h2 className="text-sm font-medium">Payments</h2>
            {invoice.payments.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">
                No payments recorded.
              </p>
            ) : (
              <ul className="mt-2 divide-y divide-border text-sm">
                {invoice.payments.map((p) => (
                  <li
                    key={p.id}
                    className="flex flex-wrap items-center justify-between gap-2 py-2"
                  >
                    <span className="capitalize text-muted-foreground">
                      {p.method}
                    </span>
                    <span className="tabular-nums font-medium">
                      {inr.format(Number(p.amount))}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {p.paymentDate.toISOString().slice(0, 10)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <h2 className="text-sm font-medium">Summary</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Status</dt>
                <dd className="capitalize">{invoice.status}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Subtotal</dt>
                <dd className="tabular-nums">
                  {inr.format(Number(invoice.subtotal))}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Discount</dt>
                <dd className="tabular-nums">
                  − {inr.format(Number(invoice.discountAmount))}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">GST</dt>
                <dd className="tabular-nums">
                  {inr.format(Number(invoice.taxAmount))}
                </dd>
              </div>
              <div className="flex justify-between font-semibold">
                <dt>Total</dt>
                <dd className="tabular-nums">
                  {inr.format(Number(invoice.totalAmount))}
                </dd>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <dt>Paid</dt>
                <dd className="tabular-nums">
                  {inr.format(Number(invoice.amountPaid))}
                </dd>
              </div>
            </dl>
          </div>
          {invoice.notes ? (
            <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm">
              <h3 className="font-medium">Internal notes</h3>
              <p className="mt-1 whitespace-pre-wrap text-muted-foreground">
                {invoice.notes}
              </p>
            </div>
          ) : null}
          {invoice.pdfUrl ? (
            <p className="text-xs text-muted-foreground">
              PDF stored at:{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-[10px]">
                {invoice.pdfUrl}
              </code>
            </p>
          ) : null}
        </aside>
      </div>
    </>
  );
}
