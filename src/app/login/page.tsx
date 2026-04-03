import Link from "next/link";
import { Suspense } from "react";

import { LoginForm } from "@/components/login-form";
import { Receipt } from "lucide-react";

export const metadata = {
  title: "Sign in — EasyBill",
};

function LoginFormFallback() {
  return (
    <div className="h-64 animate-pulse rounded-xl border border-border bg-muted/40" />
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-section/50 px-4 py-12">
      <div className="mb-8 flex items-center gap-2 text-lg font-semibold tracking-tight">
        <Receipt className="size-6 text-brand" aria-hidden />
        EasyBill
      </div>
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-sm">
        <h1 className="text-center text-xl font-semibold">Welcome back</h1>
        <p className="mt-1 text-center text-sm text-muted-foreground">
          Sign in or create an account with Supabase Auth.
        </p>
        <Suspense fallback={<LoginFormFallback />}>
          <div className="mt-6">
            <LoginForm />
          </div>
        </Suspense>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          <Link href="/" className="underline underline-offset-4 hover:text-foreground">
            Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}
