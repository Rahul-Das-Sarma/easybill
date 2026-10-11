import { Suspense } from "react";

import { InvoicesList } from "@/components/invoices/invoices-list";

export default function InvoicesPage() {
  return (
    <Suspense>
      <InvoicesList />
    </Suspense>
  );
}
