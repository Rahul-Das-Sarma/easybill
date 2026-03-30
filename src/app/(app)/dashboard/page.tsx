import Link from "next/link";
import { redirect } from "next/navigation";

import { MonthlyRevenueChart } from "@/components/dashboard/monthly-revenue-chart";
import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button-variants";
import { ensureAppUser, getSessionUser } from "@/lib/auth-user";
import { effectiveInvoiceStatus, utcStartOfToday } from "@/lib/invoice-payment-status";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

function monthStartUtc(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function addMonthsUtc(date: Date, months: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
}

function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(date: Date): string {
  return date.toLocaleString("en-IN", { month: "short", timeZone: "UTC" });
}

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }
  await ensureAppUser(user);

  const todayStart = utcStartOfToday();
  const thisMonthStart = monthStartUtc(todayStart);
  const nextMonthStart = addMonthsUtc(thisMonthStart, 1);
  const sixMonthStart = addMonthsUtc(thisMonthStart, -5);

  const [thisMonthPaidAgg, pendingRows, overdueRows, recentRows, paidLastSixMonths] =
    await Promise.all([
      prisma.invoice.aggregate({
        where: {
          userId: user.id,
          status: "paid",
          issueDate: { gte: thisMonthStart, lt: nextMonthStart },
        },
        _sum: { totalAmount: true },
      }),
      prisma.invoice.findMany({
        where: {
          userId: user.id,
          status: { not: "paid" },
          dueDate: { gte: todayStart },
        },
        select: { totalAmount: true, amountPaid: true },
      }),
      prisma.invoice.findMany({
        where: {
          userId: user.id,
          status: { not: "paid" },
          dueDate: { lt: todayStart },
        },
        select: { totalAmount: true },
      }),
      prisma.invoice.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          invoiceNumber: true,
          status: true,
          dueDate: true,
          totalAmount: true,
          amountPaid: true,
          customer: { select: { name: true } },
        },
      }),
      prisma.invoice.findMany({
        where: {
          userId: user.id,
          status: "paid",
          issueDate: { gte: sixMonthStart, lt: nextMonthStart },
        },
        select: { issueDate: true, totalAmount: true },
      }),
    ]);

  const thisMonthRevenue = Number(thisMonthPaidAgg._sum.totalAmount ?? 0);
  const pendingOutstanding = pendingRows.reduce(
    (sum, row) => sum + Math.max(0, Number(row.totalAmount) - Number(row.amountPaid)),
    0,
  );
  const overdueCount = overdueRows.length;
  const overdueTotal = overdueRows.reduce((sum, row) => sum + Number(row.totalAmount), 0);

  const monthBuckets = Array.from({ length: 6 }, (_, idx) => {
    const d = addMonthsUtc(sixMonthStart, idx);
    return { key: monthKey(d), month: monthLabel(d), revenue: 0 };
  });

  const bucketByKey = new Map(monthBuckets.map((b) => [b.key, b]));
  for (const inv of paidLastSixMonths) {
    const key = monthKey(inv.issueDate);
    const bucket = bucketByKey.get(key);
    if (bucket) {
      bucket.revenue += Number(inv.totalAmount);
    }
  }

  const chartData = monthBuckets.map((b) => ({
    month: b.month,
    revenue: Number(b.revenue.toFixed(2)),
  }));

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Overview of revenue and recent invoices."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: "Total Revenue (This Month)",
            value: inr.format(thisMonthRevenue),
            hint: "Paid invoices in current calendar month",
          },
          {
            label: "Pending Payments",
            value: inr.format(pendingOutstanding),
            hint: "Outstanding across pending invoices",
          },
          {
            label: "Overdue Invoices",
            value: `${overdueCount}`,
            hint: `Total amount ${inr.format(overdueTotal)}`,
          },
          { label: "Recent Invoices", value: `${recentRows.length}`, hint: "Latest 5 records" },
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
          <h2 className="text-sm font-medium">Monthly Revenue (Last 6 Months)</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Paid invoice totals by month.
          </p>
          <MonthlyRevenueChart data={chartData} />
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
          {recentRows.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">
              No invoices yet. Create one to see it here.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-border">
              {recentRows.map((inv) => {
                const displayStatus = effectiveInvoiceStatus(
                  inv.dueDate,
                  inv.status,
                  inv.amountPaid,
                );
                return (
                  <li key={inv.id} className="py-2">
                    <div className="flex items-center justify-between gap-2">
                      <Link
                        href={`/invoices/${inv.id}`}
                        className="font-medium hover:underline"
                      >
                        {inv.invoiceNumber}
                      </Link>
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                          displayStatus === "paid" &&
                            "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
                          displayStatus === "overdue" &&
                            "bg-destructive/15 text-destructive",
                          ["draft", "pending", "partial"].includes(displayStatus) &&
                            "bg-amber-500/15 text-amber-800 dark:text-amber-300",
                        )}
                      >
                        {displayStatus}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {inv.customer.name} · {inr.format(Number(inv.totalAmount))}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </>
  );
}
