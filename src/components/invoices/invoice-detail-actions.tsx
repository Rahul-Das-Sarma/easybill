"use client";

import { useState } from "react";

import { InvoicePdfPreviewModal } from "@/components/invoices/invoice-pdf-preview-modal";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";
import { Download, Mail, MessageCircle, FileText } from "lucide-react";

export function InvoiceDetailActions({
  invoiceId,
  invoiceNumber,
  customerEmail,
}: {
  invoiceId: string;
  invoiceNumber: string;
  customerEmail: string | null;
}) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [busy, setBusy] = useState<"email" | "wa" | null>(null);

  async function shareWhatsApp() {
    setBusy("wa");
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/signed-pdf-url`);
      const json = (await res.json()) as {
        signedUrl?: string;
        error?: string;
      };
      if (!res.ok) {
        window.alert(
          json.error ??
            "Create a PDF first: use Download, then try WhatsApp again.",
        );
        return;
      }
      const url = json.signedUrl!;
      const text = encodeURIComponent(
        `Invoice ${invoiceNumber}\n\nView / download:\n${url}`,
      );
      window.open(`https://wa.me/?text=${text}`, "_blank", "noopener,noreferrer");
    } finally {
      setBusy(null);
    }
  }

  async function sendEmail() {
    let to = customerEmail;
    if (!to) {
      const entered = window.prompt("Recipient email address");
      if (!entered?.trim()) return;
      to = entered.trim();
    }
    setBusy("email");
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          customerEmail && to === customerEmail ? {} : { to },
        ),
      });
      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
        ok?: boolean;
      };
      if (!res.ok) {
        window.alert(json.error ?? "Email failed");
        return;
      }
      window.alert("Email sent.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setPreviewOpen(true)}
        >
          <FileText className="size-4" aria-hidden />
          Preview PDF
        </Button>
        <a
          href={`/api/invoices/${invoiceId}/pdf`}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(buttonVariants({ variant: "default", size: "sm" }))}
        >
          <Download className="size-4" aria-hidden />
          Download PDF
        </a>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={busy === "wa"}
          onClick={() => void shareWhatsApp()}
        >
          <MessageCircle className="size-4" aria-hidden />
          WhatsApp
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={busy === "email"}
          onClick={() => void sendEmail()}
        >
          <Mail className="size-4" aria-hidden />
          Email
        </Button>
      </div>
      <InvoicePdfPreviewModal
        invoiceId={invoiceId}
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
      />
    </>
  );
}
