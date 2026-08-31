import { PageHeader } from "@/components/page-header";
import { SettingsFormSkeleton } from "@/components/ui/content-skeletons";

export default function SettingsLoading() {
  return (
    <>
      <PageHeader
        title="Business settings"
        description="Business type, GST registration, and invoice profile. Changes apply to new invoices."
      />
      <SettingsFormSkeleton />
    </>
  );
}
