import { PageHeader } from "@/components/page-header";
import { InventoryTableSkeleton } from "@/components/ui/content-skeletons";

export default function InventoryLoading() {
  return (
    <>
      <PageHeader
        title="Inventory"
        description="Products you sell: stock, prices, and barcodes for quick lookup."
      />
      <InventoryTableSkeleton />
    </>
  );
}
