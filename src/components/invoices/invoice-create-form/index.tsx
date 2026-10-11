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
import { resolveSupplyType, stateCodeFromGstin } from "@/lib/gst-india";
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
import type { InvoiceCustomerSearchHit, InvoiceGstProfile } from "./types";

type InvoiceFormInitial = {
  customerId: string;
  issueDate: string;
  dueDate: string;
  lines: InvoiceCreateFormValues["lines"];
  discountMode: InvoiceCreateFormValues["discountMode"];
  discountValue: number;
  notes?: string;
  customerNotes?: string;
};

export function InvoiceCreateForm({
  defaultInvoiceNumber,
  gstProfile,
  mode = "create",
  invoiceId,
  initialCustomer,
  initialValues,
}: {
  defaultInvoiceNumber: string;
  gstProfile: InvoiceGstProfile;
  mode?: "create" | "edit";
  invoiceId?: string;
  initialCustomer?: InvoiceCustomerSearchHit | null;
  initialValues?: InvoiceFormInitial;
}) {
  const isEdit = mode === "edit" && !!invoiceId;
  const router = useRouter();
  const customerDialogRef = useRef<HTMLDialogElement>(null);
  const [searchQ, setSearchQ] = useState("");
  const [hits, setHits] = useState<InvoiceCustomerSearchHit[]>(
    initialCustomer ? [initialCustomer] : [],
  );
  const [searchOpen, setSearchOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [newGst, setNewGst] = useState("");
  const [newStateCode, setNewStateCode] = useState("");
  const [createCustomerError, setCreateCustomerError] = useState<string | null>(
    null,
  );
  const [createCustomerSubmitting, setCreateCustomerSubmitting] =
    useState(false);

  const form = useForm<InvoiceCreateFormValues>({
    resolver: zodResolver(invoiceCreateFormSchema) as Resolver<InvoiceCreateFormValues>,
    defaultValues: initialValues ?? {
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
  const customerId = useWatch({ control: form.control, name: "customerId" });

  const selectedCustomer = useMemo(
    () => hits.find((c) => c.id === customerId) ?? null,
    [hits, customerId],
  );

  const totals = useMemo(() => {
    const drafts = (linesWatch ?? []).map((l) => ({
      productName: l.productName ?? "",
      quantity: Number(l.quantity) || 0,
      unitPrice: Number(l.unitPrice) || 0,
      taxRate: l.taxRate ?? 18,
    }));
    const buyerState =
      selectedCustomer?.stateCode ??
      stateCodeFromGstin(selectedCustomer?.gstNumber);
    return computeInvoiceLines(
      drafts,
      discountMode,
      Number(discountValue) || 0,
      {
        gstScheme: gstProfile.gstScheme,
        supplyType:
          gstProfile.gstScheme === "regular"
            ? resolveSupplyType(gstProfile.stateCode, buyerState)
            : "none",
      },
    );
  }, [
    linesWatch,
    discountMode,
    discountValue,
    gstProfile,
    selectedCustomer,
  ]);

  const fetchCustomers = useCallback(async (q: string) => {
    const res = await fetch(
      `/api/customers/search?q=${encodeURIComponent(q)}`,
    );
    if (!res.ok) return;
    const data = (await res.json()) as { customers: InvoiceCustomerSearchHit[] };
    setHits(data.customers);
  }, []);

  useEffect(() => {
    if (initialCustomer) {
      setSearchQ(initialCustomer.name);
    }
  }, [initialCustomer]);

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
    setNewStateCode("");
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
          stateCode: newStateCode || null,
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
        hsnCode: l.hsnCode?.trim() || null,
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

    const url = isEdit ? `/api/invoices/${invoiceId}` : "/api/invoices";
    const method = isEdit ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
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
          : isEdit
            ? "Could not update invoice. Check the form and try again."
            : "Could not create invoice. Check the form and try again.",
      );
      return;
    }

    const id = json.invoice?.id ?? invoiceId;
    if (id) {
      router.push(`/invoices/${id}`);
      router.refresh();
    }
  }

  const blankLine = {
    productName: "",
    hsnCode: "",
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
            isEdit={isEdit}
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
            gstProfile={gstProfile}
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
            ) : isEdit ? (
              "Save changes"
            ) : (
              "Save draft"
            )}
          </Button>
          <Link
            href={isEdit && invoiceId ? `/invoices/${invoiceId}` : "/invoices"}
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
        stateCode={newStateCode}
        setStateCode={setNewStateCode}
        error={createCustomerError}
        submitting={createCustomerSubmitting}
        onSubmit={onCreateCustomer}
      />
    </>
  );
}
