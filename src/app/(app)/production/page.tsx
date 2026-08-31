import { redirect } from "next/navigation";

/** Production merged into Recipes — keep old URL working. */
export default function ProductionPage() {
  redirect("/recipes");
}
