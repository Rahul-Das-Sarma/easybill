import { PageHeader } from "@/components/page-header";
import { InvoicesListSkeleton } from "@/components/ui/content-skeletons";
import { buttonVariants } from "@/components/ui/button-variants";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function InvoicesLoading() {
  return (
    <>
      <PageHeader
        title="Invoices"
        description="Search, filter, and manage GST invoices."
        actions={
          <Link href="/invoices/create" className={cn(buttonVariants({ size: "sm" }))}>
            New invoice
          </Link>
        }
      />
      <InvoicesListSkeleton />
    </>
  );
}
