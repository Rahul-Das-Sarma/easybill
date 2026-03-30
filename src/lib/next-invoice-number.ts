import type { Prisma } from "@/generated/prisma/client";

import { prisma } from "@/lib/prisma";

export async function getNextInvoiceNumber(
  userId: string,
  tx: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<string> {
  const db = tx;
  const year = new Date().getFullYear();
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { invoicePrefix: true },
  });
  const rawPrefix = (user?.invoicePrefix ?? "INV").trim().toUpperCase();
  const safePrefix = rawPrefix.replace(/[^A-Z0-9-]/g, "") || "INV";
  const prefix = `${safePrefix}-${year}-`;
  const latest = await db.invoice.findFirst({
    where: { userId, invoiceNumber: { startsWith: prefix } },
    orderBy: { invoiceNumber: "desc" },
    select: { invoiceNumber: true },
  });
  let next = 1;
  if (latest?.invoiceNumber) {
    const suffix = latest.invoiceNumber.slice(prefix.length);
    const n = Number.parseInt(suffix, 10);
    if (!Number.isNaN(n)) next = n + 1;
  }
  return `${prefix}${String(next).padStart(3, "0")}`;
}
