import { NextResponse } from "next/server";

import { ensureAppUser, getSessionUser } from "@/lib/auth-user";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

/** Placeholder until Puppeteer / @react-pdf PDF export is wired. */
export async function GET(_req: Request, { params }: Params) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureAppUser(user);

  const { id } = await params;

  const invoice = await prisma.invoice.findFirst({
    where: { id, userId: user.id },
    select: { id: true },
  });

  if (!invoice) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(
    {
      message:
        "PDF export is not implemented yet. Use invoice detail for preview, or add Puppeteer / React-PDF.",
      invoiceId: id,
    },
    { status: 501 },
  );
}
