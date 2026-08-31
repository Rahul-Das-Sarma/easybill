import Link from "next/link";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { RecipesPanel } from "@/components/recipes/recipes-panel";
import { buttonVariants } from "@/components/ui/button-variants";
import { getBusinessProfile } from "@/lib/business-profile";
import { ensureAppUser, getSessionUser } from "@/lib/auth-user";
import { cn } from "@/lib/utils";
import { Plus } from "lucide-react";

export const metadata = {
  title: "Recipes",
};

export default async function RecipesPage() {
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
        title="Recipes"
        description="Name your product, set the formula, produce when ready — it appears in Inventory and on invoices."
        actions={
          <Link
            href="/recipes/new"
            className={cn(buttonVariants({ size: "sm" }), "gap-2")}
          >
            <Plus className="size-4" aria-hidden />
            New recipe
          </Link>
        }
      />
      <RecipesPanel />
    </>
  );
}
