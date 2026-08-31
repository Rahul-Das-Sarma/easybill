import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { RecipeForm } from "@/components/recipes/recipe-form";
import { buttonVariants } from "@/components/ui/button-variants";
import { getBusinessProfile } from "@/lib/business-profile";
import { ensureAppUser, getSessionUser } from "@/lib/auth-user";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return { title: "Edit recipe" };

  const recipe = await prisma.recipe.findFirst({
    where: { id, userId: user.id },
    select: { name: true },
  });

  return { title: recipe ? `Edit ${recipe.name}` : "Edit recipe" };
}

export default async function EditRecipePage({ params }: Props) {
  const { id } = await params;
  if (!id) notFound();

  const user = await getSessionUser();
  if (!user) redirect("/login");
  await ensureAppUser(user);

  const profile = await getBusinessProfile();
  if (!profile?.isManufacturer) {
    redirect("/inventory");
  }

  const recipe = await prisma.recipe.findFirst({
    where: { id, userId: user.id },
    select: { id: true, name: true },
  });
  if (!recipe) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <PageHeader
        title="Edit recipe"
        description={recipe.name}
        actions={
          <Link
            href="/recipes"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Back to Recipes
          </Link>
        }
      />
      <RecipeForm mode="edit" recipeId={id} />
    </div>
  );
}
