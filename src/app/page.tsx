import Link from "next/link";

import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";
import { FileText, Receipt, Shield } from "lucide-react";

export default function HomePage() {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-2 font-semibold tracking-tight">
            <Receipt className="size-5 text-brand" aria-hidden />
            EasyBill
          </div>
          <Link
            href="/login"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Sign in
          </Link>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-16 md:px-6 md:py-24">
        <p className="text-sm font-medium text-brand">Invoice ERP for India</p>
        <h1 className="mt-3 max-w-2xl text-4xl font-semibold tracking-tight md:text-5xl">
          GST invoices, sent and tracked in one place.
        </h1>
        <p className="mt-4 max-w-xl text-lg text-muted-foreground">
          Built for small businesses: create invoices, record UPI and bank
          payments, and keep customers organized — without the spreadsheet
          chaos.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/login" className={cn(buttonVariants({ size: "lg" }))}>
            Get started
          </Link>
          <Link
            href="/login"
            className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
          >
            Sign in
          </Link>
        </div>
        <ul className="mt-20 grid gap-6 sm:grid-cols-3">
          {[
            {
              icon: FileText,
              title: "GST-ready invoices",
              body: "Line items with CGST/SGST rates you use every day.",
            },
            {
              icon: Receipt,
              title: "Payments & status",
              body: "Partial payments, overdue tracking, and INR totals.",
            },
            {
              icon: Shield,
              title: "Your data",
              body: "Supabase Auth and Postgres with row-level security.",
            },
          ].map(({ icon: Icon, title, body }) => (
            <li
              key={title}
              className="rounded-xl border border-border bg-card p-5 shadow-sm"
            >
              <Icon className="size-8 text-brand-600" aria-hidden />
              <h2 className="mt-3 font-medium">{title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{body}</p>
            </li>
          ))}
        </ul>
      </main>
      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        EasyBill — MVP route shell; connect Supabase env vars to use the app.
      </footer>
    </div>
  );
}
