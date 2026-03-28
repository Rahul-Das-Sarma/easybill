import { PageHeader } from "@/components/page-header";

export default function CustomersPage() {
  return (
    <>
      <PageHeader
        title="Customers"
        description="Search and open customer profiles with invoice history."
      />
      <input
        type="search"
        placeholder="Search by name, email, or GSTIN…"
        className="mb-6 h-9 max-w-md rounded-lg border border-input bg-background px-3 text-sm outline-none ring-ring focus-visible:ring-2"
        aria-label="Search customers"
      />
      <div className="rounded-xl border border-border bg-card">
        <div className="border-b border-border px-4 py-3 text-sm font-medium">
          Customers
        </div>
        <div className="p-8 text-center text-sm text-muted-foreground">
          No customers yet. Load from Prisma and list rows linking to{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">/customers/[id]</code>
          .
        </div>
      </div>
      <p className="mt-4 text-xs text-muted-foreground">
        Add a create-customer flow (dialog or separate route) when you wire CRUD.
      </p>
    </>
  );
}
