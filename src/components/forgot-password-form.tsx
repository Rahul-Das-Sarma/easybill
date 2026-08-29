"use client";

import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { authRedirectTo } from "@/lib/supabase/auth-redirect";
import { createClient } from "@/lib/supabase/client";
import { getSupabasePublishableKey } from "@/lib/supabase/env";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const hasPublishable = Boolean(getSupabasePublishableKey());

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !hasPublishable) {
    return (
      <p className="text-center text-sm text-muted-foreground">
        Missing Supabase env vars. On Vercel set{" "}
        <code className="rounded bg-muted px-1 py-0.5 text-xs">
          NEXT_PUBLIC_SUPABASE_URL
        </code>{" "}
        and{" "}
        <code className="rounded bg-muted px-1 py-0.5 text-xs">
          NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY
        </code>{" "}
        (or{" "}
        <code className="rounded bg-muted px-1 py-0.5 text-xs">
          NEXT_PUBLIC_SUPABASE_ANON_KEY
        </code>
        ), then <strong>redeploy</strong>.
      </p>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: authRedirectTo(
          "/auth/callback?next=/login/reset-password",
        ),
      });
      if (err) {
        setError(err.message);
        return;
      }
      setInfo(
        "If an account exists for that email, we sent a link to reset your password. Check your inbox and spam folder.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label htmlFor="email" className="text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-9 rounded-lg border border-input bg-background px-3 text-sm outline-none ring-ring focus-visible:ring-2"
        />
      </div>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      {info ? (
        <p className="text-sm text-muted-foreground" role="status">
          {info}
        </p>
      ) : null}
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Please wait…" : "Send reset link"}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        <Link
          href="/login"
          className="underline underline-offset-4 hover:text-foreground"
        >
          Back to sign in
        </Link>
      </p>
    </form>
  );
}
