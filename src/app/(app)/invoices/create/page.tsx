import { redirect } from "next/navigation";

import { InvoiceCreateForm } from "@/components/invoices/invoice-create-form";
import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button-variants";
import { ensureAppUser, getSessionUser } from "@/lib/auth-user";
import { getNextInvoiceNumber } from "@/lib/next-invoice-number";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";
import Link from "next/link";

export default async function CreateInvoicePage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }
  await ensureAppUser(user);
  const [defaultInvoiceNumber, gstRow] = await Promise.all([
    getNextInvoiceNumber(user.id),
    prisma.user.findUnique({
      where: { id: user.id },
      select: { gstScheme: true, stateCode: true, gstNumber: true },
    }),
  ]);

  const gstProfile = {
    gstScheme: (gstRow?.gstScheme ?? "regular") as
      | "regular"
      | "composition"
      | "unregistered",
    stateCode: gstRow?.stateCode ?? null,
    gstNumber: gstRow?.gstNumber ?? null,
  };

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
      <InvoiceCreateForm
        defaultInvoiceNumber={defaultInvoiceNumber}
        gstProfile={gstProfile}
      />
    </>
  );
}
