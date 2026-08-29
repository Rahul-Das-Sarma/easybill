"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { InvoiceCustomerDialog } from "@/components/invoices/invoice-create-form/customer-dialog";
import { Button } from "@/components/ui/button";
import {
  lockDocumentScroll,
  unlockDocumentScroll,
} from "@/lib/scroll-lock";
import type { InvoiceCustomerSearchHit } from "@/components/invoices/invoice-create-form/types";
import { Plus } from "lucide-react";

export function AddCustomerButton() {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [gst, setGst] = useState("");
  const [stateCode, setStateCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function openDialog() {
    const el = dialogRef.current;
    if (!el || el.open) return;
    setError(null);
    setName("");
    setEmail("");
    setPhone("");
    setAddress("");
    setGst("");
    setStateCode("");
    lockDocumentScroll();
    el.showModal();
  }

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const onClose = () => unlockDocumentScroll();
    dialog.addEventListener("close", onClose);
    return () => {
      dialog.removeEventListener("close", onClose);
      unlockDocumentScroll();
    };
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim() || undefined,
          phone: phone.trim() || null,
          address: address.trim() || null,
          gstNumber: gst.trim() || null,
          stateCode: stateCode || null,
        }),
      });
      const json = (await res.json()) as {
        error?: string | Record<string, string[]>;
        customer?: InvoiceCustomerSearchHit;
      };
      if (!res.ok) {
        const msg =
          typeof json.error === "string"
            ? json.error
            : "Could not create customer. Check the fields and try again.";
        setError(msg);
        return;
      }
      dialogRef.current?.close();
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Button type="button" size="sm" onClick={openDialog} className="gap-2">
        <Plus className="size-4" aria-hidden />
        Add customer
      </Button>
      <InvoiceCustomerDialog
        dialogRef={dialogRef}
        onClose={() => setError(null)}
        name={name}
        setName={setName}
        email={email}
        setEmail={setEmail}
        phone={phone}
        setPhone={setPhone}
        address={address}
        setAddress={setAddress}
        gst={gst}
        setGst={setGst}
        stateCode={stateCode}
        setStateCode={setStateCode}
        error={error}
        submitting={submitting}
        onSubmit={onSubmit}
      />
    </>
  );
}
