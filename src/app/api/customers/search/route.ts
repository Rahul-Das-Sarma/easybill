import { NextResponse } from "next/server";

import { ensureAppUser, getSessionUser } from "@/lib/auth-user";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureAppUser(user);

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();

  const customers = await prisma.customer.findMany({
    where: {
      userId: user.id,
      ...(q.length > 0
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
              { phone: { contains: q, mode: "insensitive" } },
              { gstNumber: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    take: 20,
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      gstNumber: true,
    },
  });

  return NextResponse.json({ customers });
}
