import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { ProductForm } from "@/components/inventory/product-form";
import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button-variants";
import { ensureAppUser, getSessionUser } from "@/lib/auth-user";
import { getBusinessProfile } from "@/lib/business-profile";
import { productToJson } from "@/lib/product-json";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

type Props = { params: Promise<{ id: string }> };

export default async function EditProductPage({ params }: Props) {
  const { id } = await params;
  if (!id) {
    notFound();
  }

  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }
  await ensureAppUser(user);

  const [product, profile] = await Promise.all([
    prisma.product.findFirst({
      where: { id, userId: user.id },
      include: {
        recipe: { select: { id: true, name: true } },
      },
    }),
    getBusinessProfile(),
  ]);

  if (!product) {
    notFound();
  }

  const initial = productToJson(product);

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <PageHeader
        title="Edit Product"
        description={initial.name}
        actions={
          <Link
            href="/inventory"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Back to Inventory
          </Link>
        }
      />
      <ProductForm
        mode="edit"
        productId={id}
        initial={initial}
        isManufacturer={profile?.isManufacturer ?? false}
      />
    </div>
  );
}
