import Link from "next/link";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button-variants";
import { ensureAppUser, getSessionUser } from "@/lib/auth-user";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

type Props = { searchParams: Promise<{ q?: string }> };

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

export default async function InventoryPage({ searchParams }: Props) {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }
  await ensureAppUser(user);

  const q = ((await searchParams).q ?? "").trim();

  const products = await prisma.product.findMany({
    where: {
      userId: user.id,
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { sku: { contains: q, mode: "insensitive" } },
              { barcode: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      sku: true,
      barcode: true,
      quantity: true,
      unitPrice: true,
      taxRate: true,
      isActive: true,
    },
  });

  return (
    <>
      <PageHeader
        title="Inventory"
        description="Products you sell: stock, prices, and barcodes for quick lookup."
        actions={
          <Link
            href="/inventory/new"
            className={cn(buttonVariants({ variant: "default", size: "sm" }))}
          >
            Add product
          </Link>
        }
      />

      <form
        method="get"
        className="mb-6 rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5"
      >
        <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Search
        </p>
        <div className="flex max-w-xl flex-col gap-2 sm:flex-row sm:items-center">
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Name, SKU, or barcode…"
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:border-primary/50 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/15"
            aria-label="Search products"
          />
          <button
            type="submit"
            className={cn(
              buttonVariants({ variant: "secondary", size: "sm" }),
              "h-10 shrink-0 px-5",
            )}
          >
            Search
          </button>
        </div>
      </form>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="border-b border-border bg-muted/40 px-4 py-3.5 sm:px-5">
          <span className="text-sm font-semibold tracking-tight">Products</span>
          {products.length > 0 ? (
            <span className="ml-2 font-normal text-muted-foreground">
              ({products.length}
              {q ? ` match${products.length === 1 ? "" : "es"}` : ""})
            </span>
          ) : null}
        </div>
        {products.length === 0 ? (
          <div className="flex flex-col items-center gap-5 px-6 py-12 text-center sm:py-14">
            <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
              {q
                ? "No products match your search. Try another term or clear the search."
                : "No products yet. Add a name, quantity, and unit price—SKU and barcode are optional."}
            </p>
            {!q ? (
              <Link
                href="/inventory/new"
                className={cn(
                  buttonVariants({ variant: "default", size: "default" }),
                )}
              >
                Add product
              </Link>
            ) : null}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left text-xs font-medium text-muted-foreground">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">SKU</th>
                  <th className="px-4 py-3">Barcode</th>
                  <th className="px-4 py-3 text-right">Qty</th>
                  <th className="px-4 py-3 text-right">Unit price</th>
                  <th className="px-4 py-3 text-right">GST</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr
                    key={p.id}
                    className={cn(
                      "border-b border-border/80",
                      !p.isActive && "opacity-60",
                    )}
                  >
                    <td className="px-4 py-2">
                      <span className="font-medium">{p.name}</span>
                      {!p.isActive ? (
                        <span className="ml-2 rounded-md bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                          Inactive
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-2 text-muted-foreground tabular-nums">
                      {p.sku ?? "—"}
                    </td>
                    <td className="px-4 py-2 text-muted-foreground tabular-nums">
                      {p.barcode ?? "—"}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {Number(p.quantity).toLocaleString("en-IN", {
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {inr.format(Number(p.unitPrice))}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {Number(p.taxRate)}%
                    </td>
                    <td className="px-4 py-2 text-right">
                      <Link
                        href={`/inventory/${p.id}`}
                        className={cn(
                          buttonVariants({ variant: "ghost", size: "xs" }),
                          "text-muted-foreground",
                        )}
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
