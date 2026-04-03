"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  useFieldArray,
  useForm,
  useWatch,
  type Resolver,
} from "react-hook-form";

import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { addDaysISO, todayISO } from "@/lib/invoice-dates";
import {
  invoiceCreateFormSchema,
  type InvoiceCreateFormValues,
} from "@/lib/invoice-create-form-schema";
import { computeInvoiceLines } from "@/lib/invoice-math";
import {
  lockDocumentScroll,
  unlockDocumentScroll,
} from "@/lib/scroll-lock";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

import { InvoiceAddItemsCard } from "./add-items-card";
import { InvoiceCustomerCard } from "./customer-card";
import { InvoiceCustomerDialog } from "./customer-dialog";
import { InvoiceLineItemsCard } from "./line-items-card";
import { InvoiceMetaCard } from "./meta-card";
import { InvoiceCreateFormNotes } from "./notes";
import type { InvoiceCustomerSearchHit } from "./types";

export function InvoiceCreateForm({
  defaultInvoiceNumber,
}: {
  defaultInvoiceNumber: string;
}) {
  const router = useRouter();
  const customerDialogRef = useRef<HTMLDialogElement>(null);
  const [searchQ, setSearchQ] = useState("");
  const [hits, setHits] = useState<InvoiceCustomerSearchHit[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [newGst, setNewGst] = useState("");
  const [createCustomerError, setCreateCustomerError] = useState<string | null>(
    null,
  );
  const [createCustomerSubmitting, setCreateCustomerSubmitting] =
    useState(false);

  const form = useForm<InvoiceCreateFormValues>({
    resolver: zodResolver(invoiceCreateFormSchema) as Resolver<InvoiceCreateFormValues>,
    defaultValues: {
      customerId: "",
      issueDate: todayISO(),
      dueDate: addDaysISO(30),
      lines: [],
      discountMode: "flat",
      discountValue: 0,
      notes: "",
      customerNotes: "",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "lines",
  });

  const linesWatch = useWatch({ control: form.control, name: "lines" });
  const discountMode = useWatch({ control: form.control, name: "discountMode" });
  const discountValue = useWatch({ control: form.control, name: "discountValue" });

  const totals = useMemo(() => {
    const drafts = (linesWatch ?? []).map((l) => ({
      productName: l.productName ?? "",
      quantity: Number(l.quantity) || 0,
      unitPrice: Number(l.unitPrice) || 0,
      taxRate: l.taxRate ?? 18,
    }));
    return computeInvoiceLines(drafts, discountMode, Number(discountValue) || 0);
  }, [linesWatch, discountMode, discountValue]);

  const fetchCustomers = useCallback(async (q: string) => {
    const res = await fetch(
      `/api/customers/search?q=${encodeURIComponent(q)}`,
    );
    if (!res.ok) return;
    const data = (await res.json()) as { customers: InvoiceCustomerSearchHit[] };
    setHits(data.customers);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      void fetchCustomers(searchQ);
    }, 250);
    return () => clearTimeout(t);
  }, [searchQ, fetchCustomers]);

  function openCustomerDialog() {
    const el = customerDialogRef.current;
    if (!el || el.open) return;
    setCreateCustomerError(null);
    setNewName("");
    setNewEmail("");
    setNewPhone("");
    setNewAddress("");
    setNewGst("");
    lockDocumentScroll();
    el.showModal();
  }

  function closeCustomerDialog() {
    customerDialogRef.current?.close();
  }

  useEffect(() => {
    const dialog = customerDialogRef.current;
    if (!dialog) return;
    const onClose = () => unlockDocumentScroll();
    dialog.addEventListener("close", onClose);
    return () => {
      dialog.removeEventListener("close", onClose);
      unlockDocumentScroll();
    };
  }, []);

  async function onCreateCustomer(e: FormEvent) {
    e.preventDefault();
    setCreateCustomerError(null);
    setCreateCustomerSubmitting(true);
    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          email: newEmail.trim() || undefined,
          phone: newPhone.trim() || null,
          address: newAddress.trim() || null,
          gstNumber: newGst.trim() || null,
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
        setCreateCustomerError(msg);
        return;
      }
      if (!json.customer) {
        setCreateCustomerError("Unexpected response from server.");
        return;
      }
      const c = json.customer;
      setHits((prev) => {
        const rest = prev.filter((x) => x.id !== c.id);
        return [c, ...rest];
      });
      form.setValue("customerId", c.id);
      setSearchQ(c.name);
      setSearchOpen(false);
      closeCustomerDialog();
      void fetchCustomers(c.name);
    } finally {
      setCreateCustomerSubmitting(false);
    }
  }

  async function onSubmit(values: InvoiceCreateFormValues) {
    setSubmitError(null);
    const body: Record<string, unknown> = {
      issueDate: values.issueDate,
      dueDate: values.dueDate,
      lines: values.lines.map((l) => ({
        productName: l.productName.trim(),
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        taxRate: l.taxRate,
      })),
      discountMode: values.discountMode,
      discountValue: values.discountValue,
      notes: values.notes?.trim() || null,
      customerNotes: values.customerNotes?.trim() || null,
    };

    body.customerId = values.customerId;

    const res = await fetch("/api/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const json = (await res.json().catch(() => ({}))) as {
      error?: unknown;
      invoice?: { id: string };
    };

    if (!res.ok) {
      setSubmitError(
        typeof json.error === "string"
          ? json.error
          : "Could not create invoice. Check the form and try again.",
      );
      return;
    }

    if (json.invoice?.id) {
      router.push(`/invoices/${json.invoice.id}`);
      router.refresh();
    }
  }

  const blankLine = {
    productName: "",
    quantity: 1,
    unitPrice: 0,
    taxRate: 18 as const,
  };

  return (
    <>
      <form
        onSubmit={form.handleSubmit((v) => onSubmit(v))}
        className="space-y-8"
      >
        <div className="grid gap-6 lg:grid-cols-2">
          <InvoiceMetaCard
            defaultInvoiceNumber={defaultInvoiceNumber}
            register={form.register}
          />
          <InvoiceCustomerCard
            form={form}
            searchQ={searchQ}
            setSearchQ={setSearchQ}
            searchOpen={searchOpen}
            setSearchOpen={setSearchOpen}
            hits={hits}
            onOpenNewCustomer={openCustomerDialog}
          />
        </div>

        <InvoiceAddItemsCard
          onAppendLine={(line) => append(line)}
          onAppendBlank={() => append(blankLine)}
          disabled={form.formState.isSubmitting}
        />

        {fields.length > 0 ? (
          <InvoiceLineItemsCard
            fields={fields}
            register={form.register}
            remove={remove}
            totals={totals}
          />
        ) : null}

        <InvoiceCreateFormNotes register={form.register} />

        {submitError ? (
          <p className="text-sm text-destructive" role="alert">
            {submitError}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <Button
            type="submit"
            disabled={form.formState.isSubmitting}
            aria-busy={form.formState.isSubmitting}
            className="gap-2"
          >
            {form.formState.isSubmitting ? (
              <>
                <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
                Saving…
              </>
            ) : (
              "Save draft"
            )}
          </Button>
          <Link
            href="/invoices"
            className={cn(
              buttonVariants({ variant: "outline", size: "default" }),
            )}
          >
            Cancel
          </Link>
        </div>
      </form>

      <InvoiceCustomerDialog
        dialogRef={customerDialogRef}
        onClose={() => setCreateCustomerError(null)}
        name={newName}
        setName={setNewName}
        email={newEmail}
        setEmail={setNewEmail}
        phone={newPhone}
        setPhone={setNewPhone}
        address={newAddress}
        setAddress={setNewAddress}
        gst={newGst}
        setGst={setNewGst}
        error={createCustomerError}
        submitting={createCustomerSubmitting}
        onSubmit={onCreateCustomer}
      />
    </>
  );
}
