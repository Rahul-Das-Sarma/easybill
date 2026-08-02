import { type NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

/**
 * PKCE / OAuth-style callback: exchanges `?code=` for a session cookie.
 * Point Supabase Auth redirect URLs and signUp emailRedirectTo here.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextRaw = searchParams.get("next") ?? "/dashboard";
  const next = nextRaw.startsWith("/") ? nextRaw : "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(
    `${origin}/login?error=${encodeURIComponent(
      "Could not complete sign-in. Try again.",
    )}`,
  );
}
