import { NextResponse } from "next/server";

import { ensureAppUser, getSessionUser } from "@/lib/auth-user";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

/** Mark a draft invoice as issued (pending payment). */
export async function POST(_req: Request, { params }: Params) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await ensureAppUser(user);

  const { id } = await params;
  const invoice = await prisma.invoice.findFirst({
    where: { id, userId: user.id },
  });

  if (!invoice) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (invoice.status !== "draft") {
    return NextResponse.json(
      { error: "Only draft invoices can be issued" },
      { status: 400 },
    );
  }

  const updated = await prisma.invoice.update({
    where: { id },
    data: { status: "pending" },
    select: { id: true, status: true },
  });

  return NextResponse.json({ invoice: updated });
}
