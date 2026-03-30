import { redirect } from "next/navigation";

import { BusinessSettingsForm } from "@/components/settings/business-settings-form";
import { PageHeader } from "@/components/page-header";
import { ensureAppUser, getSessionUser } from "@/lib/auth-user";
import { prisma } from "@/lib/prisma";

export default async function SettingsPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }
  await ensureAppUser(user);

  const profile = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      companyName: true,
      address: true,
      phone: true,
      gstNumber: true,
      companyLogoUrl: true,
      invoicePrefix: true,
    },
  });

  if (!profile) {
    redirect("/dashboard");
  }

  return (
    <>
      <PageHeader
        title="Business settings"
        description="Profile shown on invoices: name, company, GSTIN, address, logo."
      />
      <BusinessSettingsForm initial={profile} />
    </>
  );
}
