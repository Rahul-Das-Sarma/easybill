import Link from "next/link";
import { redirect } from "next/navigation";

import { ProductForm } from "@/components/inventory/product-form";
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
    <div className="mx-auto max-w-2xl space-y-8">
      <PageHeader
        title="New product"
        description="Enter a display name, quantity, and unit price. SKU and barcode are optional but must be unique when set."
        actions={
          <Link
            href="/inventory"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Back to inventory
          </Link>
        }
      />
      <ProductForm mode="create" />
    </div>
  );
}
