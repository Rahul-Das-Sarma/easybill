import { PageHeader } from "@/components/page-header";
import { RecipeListItemsSkeleton } from "@/components/ui/content-skeletons";

export default function RecipesLoading() {
  return (
    <>
      <PageHeader
        title="Recipes"
        description="Name your product, set the formula, produce when ready — it appears in Inventory and on invoices."
      />
      <RecipeListItemsSkeleton />
    </>
  );
}
