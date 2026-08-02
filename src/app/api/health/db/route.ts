import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

/**
 * Production DB diagnostics — no secrets.
 * Runs the same Prisma shapes the dashboard uses after login.
 */
export async function GET() {
  const raw = process.env.DATABASE_URL ?? "";
  let host = "missing";
  try {
    host = new URL(raw.replace(/^postgresql:/i, "http:")).hostname;
  } catch {
    host = "unparseable";
  }

  const portMatch = raw.match(/:(\d+)(?:\/|\?|$)/);
  const port = portMatch?.[1] ?? "unknown";
  const looksDirectIpv6Risk = /^db\.[^.]+\.supabase\.co$/i.test(host);
  const looksPooler = /pooler\.supabase\.com$/i.test(host);

  const steps: { step: string; ok: boolean; error?: string }[] = [];

  async function step(name: string, fn: () => Promise<unknown>) {
    try {
      await fn();
      steps.push({ step: name, ok: true });
    } catch (e) {
      steps.push({
        step: name,
        ok: false,
        error: e instanceof Error ? e.message.slice(0, 240) : "unknown",
      });
    }
  }

  await step("select1", () => prisma.$queryRaw`SELECT 1`);
  await step("user.findFirst", () =>
    prisma.user.findFirst({ select: { id: true, email: true } }),
  );
  await step("user.count", () => prisma.user.count());
  await step("invoice.aggregate", () =>
    prisma.invoice.aggregate({
      where: { status: "paid" },
      _sum: { totalAmount: true },
    }),
  );
  await step("invoice.findMany", () =>
    prisma.invoice.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        invoiceNumber: true,
        status: true,
        totalAmount: true,
        amountPaid: true,
        dueDate: true,
        customer: { select: { name: true } },
      },
    }),
  );

  const ok = steps.every((s) => s.ok);
  return NextResponse.json(
    {
      ok,
      host,
      port,
      pooler: looksPooler,
      warnDirectHost: looksDirectIpv6Risk
        ? "Direct db.*.supabase.co is often IPv6-only and fails on Vercel. Use pooler."
        : undefined,
      steps,
    },
    { status: ok ? 200 : 500 },
  );
}
