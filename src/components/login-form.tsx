"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

function authRedirectTo(path: string) {
  if (typeof window === "undefined") return undefined;
  return `${window.location.origin}${path}`;
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/dashboard";
  const urlError = searchParams.get("error");

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(urlError);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const hasPublishable =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

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
        ), then <strong>redeploy</strong> so{" "}
        <code className="text-xs">NEXT_PUBLIC_*</code> values are baked into the
        client.
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
      if (mode === "signin") {
        const { error: err } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (err) {
          setError(err.message);
          return;
        }
      } else {
        const { data, error: err } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: authRedirectTo("/auth/callback"),
          },
        });
        if (err) {
          setError(err.message);
          return;
        }
        // Confirm-email enabled: account created, but no session until confirm.
        if (!data.session) {
          setInfo(
            "Account created. Check your email to confirm, then sign in. If no email arrives, disable “Confirm email” in Supabase Auth settings for testing.",
          );
          setMode("signin");
          return;
        }
      }
      router.push(next.startsWith("/") ? next : "/dashboard");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="flex flex-col gap-4">
      <div className="flex rounded-lg border border-border bg-muted/40 p-1">
        <button
          type="button"
          className={cn(
            "flex-1 rounded-md py-2 text-sm font-medium transition-colors",
            mode === "signin"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
          onClick={() => {
            setMode("signin");
            setError(null);
            setInfo(null);
          }}
        >
          Sign in
        </button>
        <button
          type="button"
          className={cn(
            "flex-1 rounded-md py-2 text-sm font-medium transition-colors",
            mode === "signup"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
          onClick={() => {
            setMode("signup");
            setError(null);
            setInfo(null);
          }}
        >
          Sign up
        </button>
      </div>
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
      <div className="flex flex-col gap-2">
        <label htmlFor="password" className="text-sm font-medium">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete={
            mode === "signin" ? "current-password" : "new-password"
          }
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
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
        {loading ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
      </Button>
    </form>
  );
}
