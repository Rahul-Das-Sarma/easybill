import { NextResponse } from "next/server";

import { ensureAppUser, getSessionUser } from "@/lib/auth-user";
import { productToJson } from "@/lib/product-json";
import { prisma } from "@/lib/prisma";

/**
 * Exact lookup by barcode or SKU (for keyboard-wedge scanners).
 * GET /api/products/lookup?code=...
 */
export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await ensureAppUser(user);

  const code = (new URL(req.url).searchParams.get("code") ?? "").trim();
  if (!code) {
    return NextResponse.json(
      { error: "Query parameter \"code\" is required" },
      { status: 400 },
    );
  }

  const product = await prisma.product.findFirst({
    where: {
      userId: user.id,
      isActive: true,
      OR: [{ barcode: code }, { sku: code }],
    },
  });

  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  return NextResponse.json({ product: productToJson(product) });
}
