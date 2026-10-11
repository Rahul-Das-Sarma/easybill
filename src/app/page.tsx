import { Show, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { FileText, Package, Receipt, Shield } from "lucide-react";

import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";

const features = [
  {
    icon: FileText,
    title: "GST invoices",
    body: "Create invoices with CGST, SGST, or IGST, then download a PDF or email it.",
  },
  {
    icon: Receipt,
    title: "Payments",
    body: "Record UPI, bank, and cash payments. See what is pending or overdue.",
  },
  {
    icon: Package,
    title: "Stock and recipes",
    body: "Track finished goods and raw materials, and produce only what stock allows.",
  },
  {
    icon: Shield,
    title: "Your business profile",
    body: "GSTIN, state, and invoice prefix stay on every new invoice.",
  },
];

export default function HomePage() {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-2 font-semibold tracking-tight">
            <Receipt className="size-5 text-brand" aria-hidden />
            EasyBill
          </div>
          <div className="flex items-center gap-2">
            <Show when="signed-out">
              <Link
                href="/login"
                className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
              >
                Sign in
              </Link>
              <Link
                href="/sign-up"
                className={cn(buttonVariants({ size: "sm" }))}
              >
                Create account
              </Link>
            </Show>
            <Show when="signed-in">
              <Link
                href="/dashboard"
                className={cn(buttonVariants({ size: "sm" }))}
              >
                Open dashboard
              </Link>
              <UserButton />
            </Show>
          </div>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-16 md:px-6 md:py-24">
        <p className="text-sm font-medium text-brand">GST billing for Indian businesses</p>
        <h1 className="mt-3 max-w-2xl text-4xl font-semibold tracking-tight md:text-5xl">
          Invoices, payments, and stock in one place.
        </h1>
        <p className="mt-4 max-w-xl text-lg text-muted-foreground">
          Create GST invoices, record payments, and keep inventory in step with
          what you sell. Manufacturers can produce finished goods from recipes
          when raw materials are available.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Show when="signed-out">
            <Link href="/sign-up" className={cn(buttonVariants({ size: "lg" }))}>
              Get started
            </Link>
            <Link
              href="/login"
              className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
            >
              Sign in
            </Link>
          </Show>
          <Show when="signed-in">
            <Link href="/dashboard" className={cn(buttonVariants({ size: "lg" }))}>
              Continue to dashboard
            </Link>
          </Show>
        </div>
        <ul className="mt-20 grid gap-6 sm:grid-cols-2">
          {features.map(({ icon: Icon, title, body }) => (
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
        EasyBill — GST invoices, payments, and inventory for small businesses.
      </footer>
    </div>
  );
}
