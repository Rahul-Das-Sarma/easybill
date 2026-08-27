import { redirect } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { ProductionPanel } from "@/components/production/production-panel";
import { getBusinessProfile } from "@/lib/business-profile";
import { ensureAppUser, getSessionUser } from "@/lib/auth-user";

export default async function ProductionPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  await ensureAppUser(user);

  const profile = await getBusinessProfile();
  if (!profile?.isManufacturer) {
    redirect("/inventory");
  }

  return (
    <>
      <PageHeader
        title="Production"
        description="Manage raw materials, produce finished goods from your BOM, and keep inventory in sync."
      />
      <ProductionPanel />
    </>
  );
}
