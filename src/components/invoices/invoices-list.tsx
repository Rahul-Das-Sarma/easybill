"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";
import { Download, Eye, Loader2 } from "lucide-react";

const tabs = [
  { id: "all", label: "All" },
  { id: "paid", label: "Paid" },
  { id: "pending", label: "Pending" },
  { id: "overdue", label: "Overdue" },
] as const;

type TabId = (typeof tabs)[number]["id"];

type InvoiceRow = {
  id: string;
  invoiceNumber: string;
  status: string;
  subtotal: string;
  discountAmount: string;
  taxAmount: string;
  totalAmount: string;
  amountPaid: string;
  currency: string;
  issueDate: string;
  dueDate: string;
  createdAt: string;
  customer: { id: string; name: string };
};

type ListResponse = {
  items: InvoiceRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

export function InvoicesList() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<TabId>("all");
  const [page, setPage] = useState(1);
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    const t = setTimeout(() => {
      setQ(qInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [qInput]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["invoices", page, q, tab],
    queryFn: async () => {
      const sp = new URLSearchParams({
        page: String(page),
        limit: "20",
        tab,
      });
      if (q.trim()) sp.set("q", q.trim());
      const res = await fetch(`/api/invoices?${sp}`);
      if (!res.ok) throw new Error("Failed to load invoices");
      return res.json() as Promise<ListResponse>;
    },
  });

  const markPaid = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/invoices/${id}/mark-paid`, {
        method: "PATCH",
      });
      if (!res.ok) throw new Error("Failed to mark paid");
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["invoices"] });
    },
  });

  const toggleOne = useCallback((id: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const toggleAllPage = useCallback(
    (checked: boolean) => {
      const ids = data?.items.map((i) => i.id) ?? [];
      setSelected((prev) => {
        const next = new Set(prev);
        if (checked) ids.forEach((id) => next.add(id));
        else ids.forEach((id) => next.delete(id));
        return next;
      });
    },
    [data?.items],
  );

  const pageIds = data?.items.map((i) => i.id) ?? [];
  const allPageSelected =
    pageIds.length > 0 && pageIds.every((id) => selected.has(id));

  return (
    <>
      <PageHeader
        title="Invoices"
        description="Search, filter, and manage GST invoices."
        actions={
          <Link href="/invoices/create" className={cn(buttonVariants({ size: "sm" }))}>
            New invoice
          </Link>
        }
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <input
          type="search"
          placeholder="Customer, invoice #, or amount…"
          className="h-9 max-w-md rounded-lg border border-input bg-background px-3 text-sm outline-none ring-ring focus-visible:ring-2"
          value={qInput}
          onChange={(e) => setQInput(e.target.value)}
          aria-label="Search invoices"
        />
        {selected.size > 0 ? (
          <p className="text-xs text-muted-foreground">
            {selected.size} selected — bulk actions coming soon
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Newest first · {data?.total ?? "—"} total
          </p>
        )}
      </div>

      <div
        className="mt-4 flex flex-wrap gap-1 rounded-lg border border-border bg-muted/30 p-1"
        role="tablist"
        aria-label="Invoice status"
      >
        {tabs.map((f) => (
          <button
            key={f.id}
            type="button"
            role="tab"
            aria-selected={tab === f.id}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              tab === f.id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:bg-background/80 hover:text-foreground",
            )}
            onClick={() => {
              setTab(f.id);
              setPage(1);
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="relative mt-6 overflow-hidden rounded-xl border border-border bg-card">
        {isFetching ? (
          <div className="absolute right-3 top-3 z-10 flex items-center gap-1 text-xs text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
            Updating
          </div>
        ) : null}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left text-xs font-medium text-muted-foreground">
                <th className="w-10 px-3 py-3">
                  <input
                    type="checkbox"
                    className="size-4 rounded border-input"
                    checked={allPageSelected}
                    onChange={(e) => toggleAllPage(e.target.checked)}
                    aria-label="Select all on this page"
                  />
                </th>
                <th className="px-3 py-3">Invoice</th>
                <th className="px-3 py-3">Customer</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3 text-right">Total</th>
                <th className="px-3 py-3 text-right">Paid</th>
                <th className="px-3 py-3">Due</th>
                <th className="px-3 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-3 py-12 text-center text-muted-foreground">
                    Loading…
                  </td>
                </tr>
              ) : !data?.items.length ? (
                <tr>
                  <td colSpan={8} className="px-3 py-12 text-center text-muted-foreground">
                    No invoices match. Create one or adjust filters.
                  </td>
                </tr>
              ) : (
                data.items.map((inv) => (
                  <tr key={inv.id} className="border-b border-border/80">
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        className="size-4 rounded border-input"
                        checked={selected.has(inv.id)}
                        onChange={(e) => toggleOne(inv.id, e.target.checked)}
                        aria-label={`Select ${inv.invoiceNumber}`}
                      />
                    </td>
                    <td className="px-3 py-2 font-medium tabular-nums">
                      {inv.invoiceNumber}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {inv.customer.name}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                          inv.status === "paid" && "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
                          inv.status === "overdue" && "bg-destructive/15 text-destructive",
                          ["draft", "pending", "partial"].includes(inv.status) &&
                            "bg-amber-500/15 text-amber-800 dark:text-amber-300",
                        )}
                      >
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {inr.format(Number(inv.totalAmount))}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                      {inr.format(Number(inv.amountPaid))}
                    </td>
                    <td className="px-3 py-2 tabular-nums text-muted-foreground">
                      {inv.dueDate}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap justify-end gap-1">
                        <Link
                          href={`/invoices/${inv.id}`}
                          className={cn(
                            buttonVariants({ variant: "ghost", size: "icon-sm" }),
                            "text-muted-foreground",
                          )}
                          title="View"
                        >
                          <Eye className="size-4" aria-hidden />
                        </Link>
                        <a
                          href={`/api/invoices/${inv.id}/pdf`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={cn(
                            buttonVariants({ variant: "ghost", size: "icon-sm" }),
                            "text-muted-foreground",
                          )}
                          title="Download PDF"
                        >
                          <Download className="size-4" aria-hidden />
                        </a>
                        {inv.status !== "paid" ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="xs"
                            disabled={markPaid.isPending}
                            onClick={() => markPaid.mutate(inv.id)}
                          >
                            Mark paid
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {data && data.totalPages > 1 ? (
          <div className="flex items-center justify-between border-t border-border px-3 py-2 text-xs text-muted-foreground">
            <span>
              Page {data.page} of {data.totalPages}
            </span>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="xs"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                type="button"
                variant="outline"
                size="xs"
                disabled={page >= data.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
}
