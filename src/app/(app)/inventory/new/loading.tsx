import { PageHeader } from "@/components/page-header";
import { BulkProductFormSkeleton } from "@/components/ui/content-skeletons";

export default function NewProductLoading() {
  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <PageHeader
        title="Add Products"
        description="Add several rows, review, then save once. Empty rows are ignored."
      />
      <BulkProductFormSkeleton />
    </div>
  );
}
