import Link from "next/link";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button-variants";
import { ensureAppUser, getSessionUser } from "@/lib/auth-user";
import { getBusinessProfile } from "@/lib/business-profile";
import { formatProductNameForDisplay } from "@/lib/product-name";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

type Props = {
  searchParams: Promise<{ q?: string; kind?: string }>;
};

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

function kindLabel(kind: string) {
  return kind === "raw_material" ? "Raw material" : "Finished good";
}

export default async function InventoryPage({ searchParams }: Props) {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }
  await ensureAppUser(user);

  const profile = await getBusinessProfile();
  const isManufacturer = profile?.isManufacturer ?? false;

  const params = await searchParams;
  const q = (params.q ?? "").trim();
  const kindFilter =
    isManufacturer &&
    (params.kind === "finished_good" || params.kind === "raw_material")
      ? params.kind
      : undefined;

  const products = await prisma.product.findMany({
    where: {
      userId: user.id,
      ...(kindFilter ? { kind: kindFilter } : {}),
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
      kind: true,
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
        description={
          isManufacturer
            ? "Finished goods you sell and raw materials you consume in production."
            : "Products you sell: stock, prices, and barcodes for quick lookup."
        }
        actions={
          <Link
            href="/inventory/new"
            className={cn(buttonVariants({ variant: "default", size: "sm" }))}
          >
            Add Product
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
        <div className="flex max-w-2xl flex-col gap-2 sm:flex-row sm:items-center">
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Name, SKU, or barcode…"
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:border-primary/50 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/15"
            aria-label="Search products"
          />
          {isManufacturer ? (
            <select
              name="kind"
              defaultValue={kindFilter ?? ""}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm shadow-sm"
              aria-label="Filter by kind"
            >
              <option value="">All types</option>
              <option value="finished_good">Finished goods</option>
              <option value="raw_material">Raw materials</option>
            </select>
          ) : null}
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
              {q || kindFilter
                ? ` match${products.length === 1 ? "" : "es"}`
                : ""}
              )
            </span>
          ) : null}
        </div>
        {products.length === 0 ? (
          <div className="flex flex-col items-center gap-5 px-6 py-12 text-center sm:py-14">
            <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
              {q || kindFilter
                ? "No products match your filters. Try another term or clear the search."
                : isManufacturer
                  ? "No products yet. Add finished goods and raw materials, then set a bill of materials on each finished good."
                  : "No products yet. Add a name, quantity, and unit price—SKU and barcode are optional."}
            </p>
            {!q && !kindFilter ? (
              <Link
                href="/inventory/new"
                className={cn(
                  buttonVariants({ variant: "default", size: "default" }),
                )}
              >
                Add Product
              </Link>
            ) : null}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left text-xs font-medium text-muted-foreground">
                  <th className="px-4 py-3">Product Name</th>
                  {isManufacturer ? (
                    <th className="px-4 py-3">Type</th>
                  ) : null}
                  <th className="px-4 py-3">SKU</th>
                  <th className="px-4 py-3">Barcode</th>
                  <th className="px-4 py-3 text-right">Quantity</th>
                  <th className="px-4 py-3 text-right">Unit Price (₹)</th>
                  <th className="px-4 py-3 text-right">GST (%)</th>
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
                      <span className="font-medium">
                        {formatProductNameForDisplay(p.name)}
                      </span>
                      {!p.isActive ? (
                        <span className="ml-2 rounded-md bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                          Inactive
                        </span>
                      ) : null}
                    </td>
                    {isManufacturer ? (
                      <td className="px-4 py-2 text-muted-foreground">
                        {kindLabel(p.kind)}
                      </td>
                    ) : null}
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
