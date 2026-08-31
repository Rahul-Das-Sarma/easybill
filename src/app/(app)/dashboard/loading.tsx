import { PageHeader } from "@/components/page-header";
import { DashboardDataSkeleton } from "@/components/ui/content-skeletons";

export default function DashboardLoading() {
  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Overview of revenue and recent invoices."
      />
      <DashboardDataSkeleton />
    </>
  );
}
