import { redirect } from "next/navigation";

import { BusinessSettingsForm } from "@/components/settings/business-settings-form";
import { PageHeader } from "@/components/page-header";
import { getSessionUser, getUserSettingsProfile } from "@/lib/auth-user";

export default async function SettingsPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  const profile = await getUserSettingsProfile(user);

  if (!profile) {
    redirect("/dashboard");
  }

  return (
    <>
      <PageHeader
        title="Business settings"
        description="Business type, GST registration, and invoice profile. Changes apply to new invoices."
      />
      <BusinessSettingsForm initial={profile} />
    </>
  );
}
