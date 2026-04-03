import Link from "next/link";
import { redirect } from "next/navigation";

import { ProductBulkForm } from "@/components/inventory/product-bulk-form";
import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button-variants";
import { ensureAppUser, getSessionUser } from "@/lib/auth-user";
import { cn } from "@/lib/utils";

export default async function NewProductPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }
  await ensureAppUser(user);

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <PageHeader
        title="Add Products"
        description="Add several rows, review the summary table, then save once. Empty rows are ignored. SKU and barcode must be unique when set."
        actions={
          <Link
            href="/inventory"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Back to Inventory
          </Link>
        }
      />
      <ProductBulkForm />
    </div>
  );
}
