import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Pill badge — paid / overdue / draft / pending / partial */
export function invoiceStatusBadgeClass(status: string) {
  return cn(
    "inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize",
    status === "paid" && "bg-success/15 text-success",
    status === "overdue" && "bg-destructive/15 text-destructive",
    status === "draft" && "bg-invoice-draft/15 text-invoice-draft",
    (status === "pending" || status === "partial") &&
      "bg-warning/15 text-warning",
  )
}

/** Inline status text (tables, dl) */
export function invoiceStatusTextClass(status: string) {
  return cn(
    status === "paid" && "font-medium text-success",
    status === "overdue" && "font-medium text-destructive",
    status === "draft" && "font-medium text-invoice-draft",
    (status === "pending" || status === "partial") &&
      "font-medium text-warning",
  )
}
