import { redirect } from "next/navigation";

import { InvoiceCreateForm } from "@/components/invoices/invoice-create-form";
import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button-variants";
import { ensureAppUser, getSessionUser } from "@/lib/auth-user";
import { getNextInvoiceNumber } from "@/lib/next-invoice-number";
import { cn } from "@/lib/utils";
import Link from "next/link";

export default async function CreateInvoicePage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }
  await ensureAppUser(user);
  const defaultInvoiceNumber = await getNextInvoiceNumber(user.id);

  return (
    <>
      <PageHeader
        title="New invoice"
        description="Create a draft invoice with line items and GST."
        actions={
          <Link
            href="/invoices"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Cancel
          </Link>
        }
      />
      <InvoiceCreateForm defaultInvoiceNumber={defaultInvoiceNumber} />
    </>
  );
}
