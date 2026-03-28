import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";

type Props = { params: Promise<{ id: string }> };

export default async function CustomerDetailPage({ params }: Props) {
  const { id } = await params;
  if (!id) {
    notFound();
  }

  return (
    <>
      <PageHeader
        title="Customer"
        description={`Profile and invoice history for id ${id.slice(0, 8)}…`}
        actions={
          <Link
            href="/customers"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            All customers
          </Link>
        }
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm lg:col-span-1">
          <h2 className="text-sm font-medium">Details</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Name, email, phone, address, GSTIN from customers row.
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm lg:col-span-2">
          <h2 className="text-sm font-medium">Invoice history</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Paginated invoices for this customer_id.
          </p>
        </div>
      </div>
    </>
  );
}
