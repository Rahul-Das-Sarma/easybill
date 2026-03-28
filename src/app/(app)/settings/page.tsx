import { PageHeader } from "@/components/page-header";

export default function SettingsPage() {
  return (
    <>
      <PageHeader
        title="Business settings"
        description="Profile shown on invoices: name, company, GSTIN, address, logo."
      />
      <div className="max-w-2xl space-y-6">
        <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-sm font-medium">Business profile</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Maps to users table — sync with Supabase Auth on first login.
          </p>
          <div className="mt-4 grid gap-4">
            <div className="h-9 rounded-lg border border-dashed border-border bg-muted/20" />
            <div className="h-9 rounded-lg border border-dashed border-border bg-muted/20" />
            <div className="h-24 rounded-lg border border-dashed border-border bg-muted/20" />
          </div>
        </section>
        <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-sm font-medium">Company logo</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload to Supabase Storage; save company_logo_url on users.
          </p>
          <div className="mt-4 flex h-32 items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 text-sm text-muted-foreground">
            Logo upload placeholder
          </div>
        </section>
      </div>
    </>
  );
}
