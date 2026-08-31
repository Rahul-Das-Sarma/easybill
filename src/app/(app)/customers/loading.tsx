import { PageHeader } from "@/components/page-header";
import { CustomersTableSkeleton } from "@/components/ui/content-skeletons";

export default function CustomersLoading() {
  return (
    <>
      <PageHeader
        title="Customers"
        description="Customers created here or when you add one on a new invoice."
      />
      <CustomersTableSkeleton />
    </>
  );
}
