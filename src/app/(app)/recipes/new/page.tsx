import Link from "next/link";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { RecipeForm } from "@/components/recipes/recipe-form";
import { buttonVariants } from "@/components/ui/button-variants";
import { getBusinessProfile } from "@/lib/business-profile";
import { ensureAppUser, getSessionUser } from "@/lib/auth-user";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "New recipe",
};

export default async function NewRecipePage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  await ensureAppUser(user);

  const profile = await getBusinessProfile();
  if (!profile?.isManufacturer) {
    redirect("/inventory");
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <PageHeader
        title="New recipe"
        description="Define a reusable formula with ingredients and quantities per unit."
        actions={
          <Link
            href="/recipes"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Back to Recipes
          </Link>
        }
      />
      <RecipeForm mode="create" />
    </div>
  );
}
