import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Overview of revenue and recent invoices."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Outstanding", value: "—", hint: "Unpaid total" },
          { label: "This month", value: "—", hint: "Revenue (INR)" },
          { label: "Invoices", value: "—", hint: "All time" },
          { label: "Overdue", value: "—", hint: "Count" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-border bg-card p-4 shadow-sm"
          >
            <p className="text-sm text-muted-foreground">{stat.label}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{stat.value}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{stat.hint}</p>
          </div>
        ))}
      </div>
      <section className="mt-8 grid gap-8 lg:grid-cols-5">
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm lg:col-span-3">
          <h2 className="text-sm font-medium">Revenue</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Chart (Recharts) will render here with real data.
          </p>
          <div className="mt-6 flex h-48 items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 text-sm text-muted-foreground">
            Revenue chart placeholder
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-medium">Recent invoices</h2>
            <Link
              href="/invoices"
              className={cn(buttonVariants({ variant: "outline", size: "xs" }))}
            >
              View all
            </Link>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            No invoices yet. Create one to see it here.
          </p>
        </div>
      </section>
    </>
  );
}
