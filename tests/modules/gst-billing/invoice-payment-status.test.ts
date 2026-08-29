import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  effectiveInvoiceStatus,
  isInvoiceOverdue,
  paymentMethodLabel,
  utcStartOfToday,
} from "@/lib/invoice-payment-status";

describe("invoice-payment-status", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-29T15:30:00+05:30"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("utcStartOfToday", () => {
    it("returns UTC midnight for the current calendar day", () => {
      const start = utcStartOfToday();
      expect(start.toISOString()).toBe("2026-08-29T00:00:00.000Z");
    });
  });

  describe("isInvoiceOverdue", () => {
    it("returns false for paid invoices regardless of due date", () => {
      const past = new Date("2026-01-01T00:00:00.000Z");
      expect(isInvoiceOverdue(past, "paid")).toBe(false);
    });

    it("returns true when due date is before today", () => {
      const past = new Date("2026-08-28T00:00:00.000Z");
      expect(isInvoiceOverdue(past, "pending")).toBe(true);
    });

    it("returns false when due date is today or in the future", () => {
      const today = new Date("2026-08-29T00:00:00.000Z");
      const future = new Date("2026-09-01T00:00:00.000Z");
      expect(isInvoiceOverdue(today, "pending")).toBe(false);
      expect(isInvoiceOverdue(future, "pending")).toBe(false);
    });
  });

  describe("effectiveInvoiceStatus", () => {
    const today = new Date("2026-08-29T00:00:00.000Z");
    const past = new Date("2026-08-28T00:00:00.000Z");
    const future = new Date("2026-09-01T00:00:00.000Z");

    it("returns paid when status is paid", () => {
      expect(effectiveInvoiceStatus(past, "paid")).toBe("paid");
    });

    it("returns overdue when unpaid and past due", () => {
      expect(effectiveInvoiceStatus(past, "pending")).toBe("overdue");
      expect(effectiveInvoiceStatus(past, "draft")).toBe("overdue");
    });

    it("maps stale overdue status with future due date to pending or partial", () => {
      expect(effectiveInvoiceStatus(future, "overdue", { toString: () => "0" })).toBe(
        "pending",
      );
      expect(
        effectiveInvoiceStatus(future, "overdue", { toString: () => "100" }),
      ).toBe("partial");
    });

    it("returns underlying status when not paid and not past due", () => {
      expect(effectiveInvoiceStatus(future, "pending")).toBe("pending");
      expect(effectiveInvoiceStatus(future, "draft")).toBe("draft");
      expect(effectiveInvoiceStatus(today, "partial")).toBe("partial");
    });

    it("handles null amountPaid for overdue remapping", () => {
      expect(effectiveInvoiceStatus(future, "overdue", null)).toBe("pending");
    });
  });

  describe("paymentMethodLabel", () => {
    it("returns human labels for known methods", () => {
      expect(paymentMethodLabel("cash")).toBe("Cash");
      expect(paymentMethodLabel("upi")).toBe("UPI");
      expect(paymentMethodLabel("bank_transfer")).toBe("Bank transfer");
      expect(paymentMethodLabel("card")).toBe("Card");
      expect(paymentMethodLabel("cheque")).toBe("Cheque");
      expect(paymentMethodLabel("other")).toBe("Other");
    });

    it("returns the raw method for unknown values", () => {
      expect(paymentMethodLabel("crypto")).toBe("crypto");
    });
  });
});
