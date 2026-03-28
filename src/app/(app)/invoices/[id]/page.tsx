import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";

type Props = { params: Promise<{ id: string }> };

export default async function InvoiceDetailPage({ params }: Props) {
  const { id } = await params;
  if (!id) {
    notFound();
  }

  return (
    <>
      <PageHeader
        title={`Invoice ${id.slice(0, 8)}…`}
        description="Status, totals, line items, payments, PDF, and actions."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/invoices/${id}/edit`}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              Edit
            </Link>
            <button
              type="button"
              disabled
              className={cn(
                buttonVariants({ size: "sm" }),
                "pointer-events-none opacity-50",
              )}
            >
              Send / Download
            </button>
          </div>
        }
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <h2 className="text-sm font-medium">Line items</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Table from Prisma + invoice_items.
            </p>
          </section>
          <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <h2 className="text-sm font-medium">Payments</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              List from payments table; record partial payments.
            </p>
          </section>
        </div>
        <aside className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <h2 className="text-sm font-medium">Summary</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Status</dt>
                <dd>—</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Total</dt>
                <dd className="tabular-nums">—</dd>
              </div>
            </dl>
          </div>
          <p className="text-xs text-muted-foreground">
            Edit is limited to draft / pending in the edit route.
          </p>
        </aside>
      </div>
    </>
  );
}
