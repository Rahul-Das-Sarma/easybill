import { NextResponse } from "next/server";

import { ensureAppUser, getSessionUser } from "@/lib/auth-user";
import { loadInvoicePdfPayload } from "@/lib/invoice-pdf/load-payload";
import { renderInvoicePdfBuffer } from "@/lib/invoice-pdf/render-pdf";
import { uploadInvoicePdfAndSaveUrl } from "@/lib/invoice-pdf/storage-upload";

type Params = { params: Promise<{ id: string }> };

function safeFilename(s: string) {
  return s.replace(/[^\w.-]+/g, "_") || "invoice";
}

export async function GET(_req: Request, { params }: Params) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureAppUser(user);

  const { id } = await params;
  const data = await loadInvoicePdfPayload(id, user.id);
  if (!data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const buffer = await renderInvoicePdfBuffer(data);

  try {
    await uploadInvoicePdfAndSaveUrl(user.id, id, buffer);
  } catch (e) {
    console.error("PDF storage upload skipped or failed:", e);
  }

  const name = safeFilename(data.invoice.invoiceNumber);
  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${name}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
