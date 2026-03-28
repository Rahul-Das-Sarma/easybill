import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";

type Props = { params: Promise<{ id: string }> };

export default async function EditInvoicePage({ params }: Props) {
  const { id } = await params;
  if (!id) {
    notFound();
  }

  return (
    <>
      <PageHeader
        title="Edit invoice"
        description="Only draft and pending invoices can be edited. Others should redirect or show a message."
        actions={
          <Link
            href={`/invoices/${id}`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Back to invoice
          </Link>
        }
      />
      <div className="max-w-3xl rounded-xl border border-border bg-card p-6 shadow-sm">
        <p className="text-sm text-muted-foreground">
          Reuse the create form with default values; validate status server-side
          before update.
        </p>
      </div>
    </>
  );
}
