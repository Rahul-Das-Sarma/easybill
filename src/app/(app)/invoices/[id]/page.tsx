import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { CompliancePanel } from "@/components/invoices/compliance-panel";
import { InvoiceDetailActions } from "@/components/invoices/invoice-detail-actions";
import { InvoiceLifecycleActions } from "@/components/invoices/invoice-lifecycle-actions";
import { InvoicePaymentsPanel } from "@/components/invoices/invoice-payments-panel";
import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button-variants";
import { ensureAppUser, getSessionUser } from "@/lib/auth-user";
import { COMPOSITION_DISCLAIMER } from "@/lib/gst-india";
import {
  effectiveInvoiceStatus,
  isInvoiceOverdue,
} from "@/lib/invoice-payment-status";
import { prisma } from "@/lib/prisma";
import { cn, invoiceStatusTextClass } from "@/lib/utils";

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
  const displayStatus = effectiveInvoiceStatus(
    invoice.dueDate,
    invoice.status,
    invoice.amountPaid,
  );
  const overdue = isInvoiceOverdue(invoice.dueDate, invoice.status);
  const outstanding =
    Number(invoice.totalAmount.toString()) -
    Number(invoice.amountPaid.toString());
  const showGst = invoice.gstSchemeAtIssue === "regular";
  const isInter = invoice.supplyType === "inter";

  const isDraft =
    invoice.status === "draft" && Number(invoice.amountPaid.toString()) === 0;

  return (
    <>
      <PageHeader
        title={invoice.invoiceNumber}
        description={`${c.name} · Due ${invoice.dueDate.toISOString().slice(0, 10)}${overdue ? " · Overdue" : ""}`}
        actions={
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <InvoiceDetailActions
              invoiceId={invoice.id}
              invoiceNumber={invoice.invoiceNumber}
              customerEmail={c.email}
            />
            {isDraft ? (
              <>
                <InvoiceLifecycleActions
                  invoiceId={invoice.id}
                  status={invoice.status}
                  amountPaid={invoice.amountPaid.toString()}
                />
                <Link
                  href={`/invoices/${id}/edit`}
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" }),
                  )}
                >
                  Edit
                </Link>
              </>
            ) : null}
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
                    {showGst ? (
                      <th className="pb-2 text-right font-medium">GST%</th>
                    ) : null}
                    {showGst && !isInter ? (
                      <>
                        <th className="pb-2 text-right font-medium">CGST</th>
                        <th className="pb-2 text-right font-medium">SGST</th>
                      </>
                    ) : null}
                    {showGst && isInter ? (
                      <th className="pb-2 text-right font-medium">IGST</th>
                    ) : null}
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
                      {showGst ? (
                        <td className="py-2 text-right tabular-nums">
                          {it.taxRate.toString()}%
                        </td>
                      ) : null}
                      {showGst && !isInter ? (
                        <>
                          <td className="py-2 text-right tabular-nums">
                            {inr.format(Number(it.cgstAmount))}
                          </td>
                          <td className="py-2 text-right tabular-nums">
                            {inr.format(Number(it.sgstAmount))}
                          </td>
                        </>
                      ) : null}
                      {showGst && isInter ? (
                        <td className="py-2 text-right tabular-nums">
                          {inr.format(Number(it.igstAmount))}
                        </td>
                      ) : null}
                      <td className="py-2 text-right tabular-nums font-medium">
                        {inr.format(Number(it.total))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <InvoicePaymentsPanel
            key={`${invoice.id}-${invoice.amountPaid.toString()}-${invoice.payments.length}`}
            invoiceId={invoice.id}
            totalAmount={invoice.totalAmount.toString()}
            amountPaid={invoice.amountPaid.toString()}
            status={invoice.status}
            payments={invoice.payments.map((p) => ({
              id: p.id,
              amount: p.amount.toString(),
              paymentDate: p.paymentDate.toISOString().slice(0, 10),
              method: p.method,
              reference: p.reference,
              notes: p.notes,
              createdAt: p.createdAt.toISOString(),
            }))}
          />
        </div>

        <aside className="space-y-4">
          <CompliancePanel
            invoiceId={invoice.id}
            irn={invoice.irn}
            irnAckNo={invoice.irnAckNo}
            ewayBillNo={invoice.ewayBillNo}
            canGenerate={!isDraft && invoice.gstSchemeAtIssue === "regular"}
          />
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <h2 className="text-sm font-medium">Summary</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Status</dt>
                <dd
                  className={cn(
                    "capitalize",
                    invoiceStatusTextClass(displayStatus),
                  )}
                >
                  {displayStatus.replaceAll("_", " ")}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Taxable</dt>
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
              {showGst && !isInter ? (
                <>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">CGST</dt>
                    <dd className="tabular-nums">
                      {inr.format(Number(invoice.cgstAmount))}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">SGST</dt>
                    <dd className="tabular-nums">
                      {inr.format(Number(invoice.sgstAmount))}
                    </dd>
                  </div>
                </>
              ) : null}
              {showGst && isInter ? (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">IGST</dt>
                  <dd className="tabular-nums">
                    {inr.format(Number(invoice.igstAmount))}
                  </dd>
                </div>
              ) : null}
              {showGst ? (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Total GST</dt>
                  <dd className="tabular-nums">
                    {inr.format(Number(invoice.taxAmount))}
                  </dd>
                </div>
              ) : null}
              {invoice.gstSchemeAtIssue === "composition" ? (
                <p className="text-xs text-muted-foreground">
                  {COMPOSITION_DISCLAIMER}
                </p>
              ) : null}
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
              <div className="flex justify-between border-t border-border pt-2 font-medium">
                <dt>Outstanding</dt>
                <dd
                  className={cn(
                    "tabular-nums",
                    outstanding > 0.004 && "text-warning",
                  )}
                >
                  {inr.format(Math.max(0, outstanding))}
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
