import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

/**
 * Lightweight DB check for production debugging.
 * Does not return secrets — only ok / error class + host hint.
 */
export async function GET() {
  const raw = process.env.DATABASE_URL ?? "";
  let host = "missing";
  try {
    host = new URL(raw.replace(/^postgresql:/i, "http:")).hostname;
  } catch {
    host = "unparseable";
  }

  const looksDirectIpv6Risk = /^db\.[^.]+\.supabase\.co$/i.test(host);
  const looksPooler = /pooler\.supabase\.com$/i.test(host);

  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      ok: true,
      host,
      pooler: looksPooler,
      warnDirectHost: looksDirectIpv6Risk
        ? "Direct db.*.supabase.co is often IPv6-only and fails on Vercel. Use Transaction pooler :6543."
        : undefined,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown error";
    return NextResponse.json(
      {
        ok: false,
        host,
        pooler: looksPooler,
        warnDirectHost: looksDirectIpv6Risk
          ? "Direct db.*.supabase.co is often IPv6-only and fails on Vercel. Use Transaction pooler :6543."
          : undefined,
        error: message.slice(0, 200),
      },
      { status: 500 },
    );
  }
}
