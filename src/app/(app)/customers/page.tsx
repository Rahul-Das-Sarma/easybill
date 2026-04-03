import Link from "next/link";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button-variants";
import { ensureAppUser, getSessionUser } from "@/lib/auth-user";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

type Props = { searchParams: Promise<{ q?: string }> };

export default async function CustomersPage({ searchParams }: Props) {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }
  await ensureAppUser(user);

  const q = ((await searchParams).q ?? "").trim();

  const customers = await prisma.customer.findMany({
    where: {
      userId: user.id,
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
              { gstNumber: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      gstNumber: true,
      createdAt: true,
    },
  });

  return (
    <>
      <PageHeader
        title="Customers"
        description="Customers created here or when you add one on a new invoice."
      />

      <form method="get" className="mb-6 flex max-w-md flex-col gap-2 sm:flex-row sm:items-center">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search by name, email, or GSTIN…"
          className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none ring-ring focus-visible:ring-2"
          aria-label="Search customers"
        />
        <button
          type="submit"
          className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "shrink-0")}
        >
          Search
        </button>
      </form>

      <div className="rounded-xl border border-border bg-card">
        <div className="border-b border-border px-4 py-3 text-sm font-medium">
          Customers
          {customers.length > 0 ? (
            <span className="ml-2 font-normal text-muted-foreground">
              ({customers.length}
              {q ? ` match${customers.length === 1 ? "" : "es"}` : ""})
            </span>
          ) : null}
        </div>
        {customers.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            {q
              ? "No customers match your search."
              : "No customers yet. Create an invoice and add a new customer, or add customers from your workflow when that’s available."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left text-xs font-medium text-muted-foreground">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">GSTIN</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.id} className="border-b border-border/80">
                    <td className="px-4 py-2 font-medium">{c.name}</td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {c.email ?? "—"}
                    </td>
                    <td className="px-4 py-2 text-muted-foreground tabular-nums">
                      {c.phone ?? "—"}
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {c.gstNumber ?? "—"}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <Link
                        href={`/customers/${c.id}`}
                        className={cn(
                          buttonVariants({ variant: "ghost", size: "xs" }),
                          "text-muted-foreground",
                        )}
                      >
                        View
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
