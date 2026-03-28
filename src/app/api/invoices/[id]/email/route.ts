import { NextResponse } from "next/server";
import { Resend } from "resend";
import { z } from "zod";

import { ensureAppUser, getSessionUser } from "@/lib/auth-user";
import { loadInvoicePdfPayload } from "@/lib/invoice-pdf/load-payload";
import { renderInvoicePdfBuffer } from "@/lib/invoice-pdf/render-pdf";
import { uploadInvoicePdfAndSaveUrl } from "@/lib/invoice-pdf/storage-upload";

type Params = { params: Promise<{ id: string }> };

const bodySchema = z.object({
  to: z.string().email().optional(),
});

function safeFilename(s: string) {
  return s.replace(/[^\w.-]+/g, "_") || "invoice";
}

export async function POST(req: Request, { params }: Params) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureAppUser(user);

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "RESEND_API_KEY is not configured." },
      { status: 500 },
    );
  }

  const { id } = await params;
  const data = await loadInvoicePdfPayload(id, user.id);
  if (!data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body: z.infer<typeof bodySchema> = {};
  try {
    const json = await req.json().catch(() => ({}));
    const parsed = bodySchema.safeParse(json);
    if (parsed.success) body = parsed.data;
  } catch {
    /* empty body */
  }

  const to = body.to ?? data.customer.email;
  if (!to) {
    return NextResponse.json(
      { error: "No recipient. Add a customer email or pass { \"to\": \"...\" }." },
      { status: 400 },
    );
  }

  const buffer = await renderInvoicePdfBuffer(data);
  try {
    await uploadInvoicePdfAndSaveUrl(user.id, id, buffer);
  } catch (e) {
    console.error("PDF storage after email send:", e);
  }

  const from =
    process.env.RESEND_FROM_EMAIL ??
    "EasyBill <onboarding@resend.dev>";

  const resend = new Resend(apiKey);
  const fileName = `${safeFilename(data.invoice.invoiceNumber)}.pdf`;

  const { error } = await resend.emails.send({
    from,
    to: [to],
    subject: `Invoice ${data.invoice.invoiceNumber} from ${data.business.companyName}`,
    html: `<p>Hi ${escapeHtml(data.customer.name)},</p>
<p>Please find invoice <strong>${escapeHtml(data.invoice.invoiceNumber)}</strong> attached.</p>
<p>Thank you,<br/>${escapeHtml(data.business.companyName)}</p>`,
    attachments: [
      {
        filename: fileName,
        content: buffer.toString("base64"),
      },
    ],
  });

  if (error) {
    return NextResponse.json(
      { error: error.message ?? "Resend rejected the request" },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true, to });
}

function escapeHtml(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
