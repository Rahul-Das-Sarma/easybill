/** UTC calendar date start (for comparing @db.Date due dates consistently). */
export function utcStartOfToday(): Date {
  const n = new Date();
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()));
}

export function isInvoiceOverdue(dueDate: Date, status: string): boolean {
  if (status === "paid") return false;
  return dueDate < utcStartOfToday();
}

/** Badge / tab display: unpaid + past due → overdue; stale DB overdue with future due → pending. */
export function effectiveInvoiceStatus(
  dueDate: Date,
  status: string,
  amountPaid?: { toString(): string } | null,
): string {
  if (status === "paid") return "paid";
  if (dueDate < utcStartOfToday()) return "overdue";
  if (status === "overdue") {
    const paid = Number(amountPaid?.toString() ?? 0);
    return paid > 0 ? "partial" : "pending";
  }
  return status;
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: "Cash",
  upi: "UPI",
  bank_transfer: "Bank transfer",
  card: "Card",
  cheque: "Cheque",
  other: "Other",
};

export function paymentMethodLabel(method: string): string {
  return PAYMENT_METHOD_LABELS[method] ?? method;
}
