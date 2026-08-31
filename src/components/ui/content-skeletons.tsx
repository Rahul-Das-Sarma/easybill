import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/** Accessible wrapper for async data placeholders (not full-page chrome). */
function DataSkeleton({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(className)} aria-busy="true" aria-live="polite">
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

export function RecipeListItemsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <DataSkeleton label="Loading recipes">
      <ul className="space-y-4">
        {Array.from({ length: count }).map((_, i) => (
          <li
            key={i}
            className="rounded-xl border border-border bg-card p-5 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-5 w-24 rounded-md" />
                  <Skeleton className="h-5 w-20 rounded-md" />
                </div>
                <Skeleton className="h-3 w-full max-w-md" />
                <Skeleton className="h-3 w-56" />
              </div>
              <Skeleton className="h-8 w-16 rounded-lg" />
            </div>
            <div className="mt-4 flex items-end gap-3 border-t border-border pt-4">
              <Skeleton className="h-9 w-28 rounded-lg" />
              <Skeleton className="h-8 w-20 rounded-lg" />
            </div>
          </li>
        ))}
      </ul>
    </DataSkeleton>
  );
}

export function RecipeFormFieldsSkeleton() {
  return (
    <DataSkeleton label="Loading recipe fields" className="mt-4 grid gap-4 sm:grid-cols-2">
      <Skeleton className="h-9 w-full rounded-lg sm:col-span-2" />
      <Skeleton className="h-9 w-full rounded-lg" />
      <Skeleton className="h-9 w-full rounded-lg" />
      <Skeleton className="h-16 w-full rounded-lg sm:col-span-2" />
    </DataSkeleton>
  );
}

export function FormulaLinesSkeleton({ count = 3 }: { count?: number }) {
  return (
    <DataSkeleton label="Loading formula ingredients" className="mt-4 space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 py-2">
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-9 w-24 rounded-lg" />
        </div>
      ))}
    </DataSkeleton>
  );
}

export function RecipePreviewContentSkeleton({ count = 3 }: { count?: number }) {
  return (
    <DataSkeleton label="Loading recipe details" className="mt-3 space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex justify-between gap-2">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-3 w-28" />
        </div>
      ))}
    </DataSkeleton>
  );
}

export function BomEditorContentSkeleton() {
  return (
    <DataSkeleton label="Loading bill of materials">
      <Skeleton className="mt-4 h-9 w-full rounded-lg" />
      <div className="mt-4 space-y-3">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 py-2">
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-9 w-24 rounded-lg" />
          </div>
        ))}
      </div>
      <Skeleton className="mt-4 h-8 w-24 rounded-lg" />
    </DataSkeleton>
  );
}

export function ListRowsSkeleton({
  count = 4,
  bordered = true,
}: {
  count?: number;
  bordered?: boolean;
}) {
  return (
    <DataSkeleton
      label="Loading list"
      className={cn(
        "space-y-2",
        bordered && "rounded-lg border border-border",
      )}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "flex items-baseline justify-between gap-2 px-3 py-2",
            bordered && i < count - 1 && "border-b border-border",
          )}
        >
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </DataSkeleton>
  );
}

export function TableRowsSkeleton({
  rows = 6,
  columns = 7,
}: {
  rows?: number;
  columns?: number;
}) {
  return (
    <>
      {Array.from({ length: rows }).map((_, row) => (
        <tr key={row} className="border-b border-border/80">
          {Array.from({ length: columns }).map((_, col) => (
            <td key={col} className="px-3 py-3">
              <Skeleton
                className={cn(
                  "h-4",
                  col === columns - 1 ? "ml-auto w-20" : "w-full max-w-[8rem]",
                )}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

/** Dashboard stats + charts only — page header stays outside. */
export function DashboardDataSkeleton() {
  return (
    <DataSkeleton label="Loading dashboard data" className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-border bg-card p-4 shadow-sm"
          >
            <Skeleton className="h-3 w-28" />
            <Skeleton className="mt-3 h-8 w-24" />
            <Skeleton className="mt-2 h-3 w-36" />
          </div>
        ))}
      </div>
      <div className="grid gap-8 lg:grid-cols-5">
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm lg:col-span-3">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="mt-2 h-3 w-40" />
          <Skeleton className="mt-4 h-60 w-full rounded-lg" />
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm lg:col-span-2">
          <Skeleton className="h-4 w-32" />
          <div className="mt-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="space-y-2 border-b border-border pb-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-40" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </DataSkeleton>
  );
}

export function FormBlockSkeleton() {
  return (
    <DataSkeleton label="Loading content" className="space-y-4 p-8">
      <Skeleton className="h-9 w-full rounded-lg" />
      <Skeleton className="h-32 w-full rounded-lg" />
    </DataSkeleton>
  );
}

export function AuthFormSkeleton() {
  return (
    <DataSkeleton label="Loading form" className="flex flex-col gap-4">
      <Skeleton className="h-10 w-full rounded-lg" />
      <Skeleton className="h-9 w-full rounded-lg" />
      <Skeleton className="h-9 w-full rounded-lg" />
      <Skeleton className="h-9 w-full rounded-lg" />
    </DataSkeleton>
  );
}

/** Invoices list — page header stays outside. */
export function InvoicesListSkeleton() {
  return (
    <DataSkeleton label="Loading invoices" className="space-y-4">
      <Skeleton className="h-9 w-full max-w-md rounded-lg" />
      <div className="flex flex-wrap gap-1 rounded-lg border border-border bg-muted/30 p-1">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-16 rounded-md" />
        ))}
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                {Array.from({ length: 7 }).map((_, i) => (
                  <th key={i} className="px-3 py-3">
                    <Skeleton className="h-3 w-16" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <TableRowsSkeleton rows={8} columns={7} />
            </tbody>
          </table>
        </div>
      </div>
    </DataSkeleton>
  );
}

/** Customers list — page header stays outside. */
export function CustomersTableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <DataSkeleton label="Loading customers" className="space-y-6">
      <div className="flex max-w-md flex-col gap-2 sm:flex-row sm:items-center">
        <Skeleton className="h-9 w-full rounded-lg" />
        <Skeleton className="h-9 w-20 shrink-0 rounded-lg" />
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="border-b border-border px-4 py-3">
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                {Array.from({ length: 5 }).map((_, i) => (
                  <th key={i} className="px-4 py-3">
                    <Skeleton className="h-3 w-16" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <TableRowsSkeleton rows={rows} columns={5} />
            </tbody>
          </table>
        </div>
      </div>
    </DataSkeleton>
  );
}

/** Settings form — page header stays outside. */
export function SettingsFormSkeleton() {
  return (
    <DataSkeleton label="Loading settings" className="space-y-6">
      <div className="grid gap-6 rounded-xl border border-border bg-card p-6 shadow-sm lg:grid-cols-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        ))}
      </div>
      <Skeleton className="h-9 w-28 rounded-lg" />
    </DataSkeleton>
  );
}

/** Inventory list table — page header stays outside. */
export function InventoryTableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <DataSkeleton label="Loading inventory" className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="mt-3 h-10 w-full max-w-2xl rounded-md" />
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                {Array.from({ length: 6 }).map((_, i) => (
                  <th key={i} className="px-3 py-3">
                    <Skeleton className="h-3 w-16" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <TableRowsSkeleton rows={rows} columns={6} />
            </tbody>
          </table>
        </div>
      </div>
    </DataSkeleton>
  );
}

/** Bulk add products form — section titles stay outside. */
export function BulkProductFormSkeleton() {
  return (
    <DataSkeleton label="Loading product form" className="space-y-6">
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="border-b border-border bg-muted/40 px-4 py-4 sm:px-6">
          <h2 className="text-sm font-semibold tracking-tight">Find in Catalog</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Search your existing products and add them to the draft list.
          </p>
        </div>
        <div className="space-y-3 p-4 sm:p-6">
          <Skeleton className="h-9 w-full max-w-md rounded-lg" />
          <Skeleton className="h-3 w-full max-w-lg" />
        </div>
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="border-b border-border bg-muted/40 px-4 py-4 sm:px-6">
          <h2 className="text-sm font-semibold tracking-tight">Products to Create</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Edit any field. Empty name rows are skipped when you save.
          </p>
        </div>
        <div className="overflow-x-auto p-2 sm:p-4">
          <table className="w-full min-w-[900px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border">
                {Array.from({ length: 7 }).map((_, i) => (
                  <th key={i} className="px-2 py-2">
                    <Skeleton className="h-3 w-20" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <TableRowsSkeleton rows={2} columns={7} />
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap gap-3 border-t border-border px-4 py-4 sm:px-6">
          <Skeleton className="h-9 w-28 rounded-lg" />
          <Skeleton className="h-9 w-36 rounded-lg" />
        </div>
      </div>
    </DataSkeleton>
  );
}
