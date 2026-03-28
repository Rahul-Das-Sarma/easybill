import { NextResponse } from "next/server";

import { ensureAppUser, getSessionUser } from "@/lib/auth-user";
import { loadInvoicePdfPayload } from "@/lib/invoice-pdf/load-payload";
import { renderInvoicePdfBuffer } from "@/lib/invoice-pdf/render-pdf";
import {
  createSignedInvoicePdfUrl,
  uploadInvoicePdfAndSaveUrl,
} from "@/lib/invoice-pdf/storage-upload";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

const DEFAULT_TTL = 60 * 60 * 24 * 7;

/** Returns a time-limited signed URL for the stored PDF (generate PDF first via GET …/pdf). */
export async function GET(req: Request, { params }: Params) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureAppUser(user);

  const { id } = await params;
  let inv = await prisma.invoice.findFirst({
    where: { id, userId: user.id },
    select: { pdfUrl: true, invoiceNumber: true },
  });

  if (!inv) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!inv.pdfUrl && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const data = await loadInvoicePdfPayload(id, user.id);
    if (data) {
      const buffer = await renderInvoicePdfBuffer(data);
      await uploadInvoicePdfAndSaveUrl(user.id, id, buffer);
      inv = await prisma.invoice.findFirst({
        where: { id, userId: user.id },
        select: { pdfUrl: true, invoiceNumber: true },
      });
    }
  }

  if (!inv?.pdfUrl) {
    return NextResponse.json(
      {
        error:
          "No stored PDF. Download the invoice once, or set SUPABASE_SERVICE_ROLE_KEY and ensure the Storage bucket exists.",
      },
      { status: 400 },
    );
  }

  const { searchParams } = new URL(req.url);
  const ttl = Math.min(
    DEFAULT_TTL,
    Math.max(60, Number.parseInt(searchParams.get("ttl") ?? "", 10) || DEFAULT_TTL),
  );

  const signedUrl = await createSignedInvoicePdfUrl(inv.pdfUrl, ttl);
  if (!signedUrl) {
    return NextResponse.json(
      { error: "Could not create signed URL. Check SUPABASE_SERVICE_ROLE_KEY and bucket." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    signedUrl,
    expiresInSeconds: ttl,
    invoiceNumber: inv.invoiceNumber,
  });
}
