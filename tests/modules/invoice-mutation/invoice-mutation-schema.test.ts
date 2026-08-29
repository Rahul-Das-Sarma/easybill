import { describe, expect, it } from "vitest";

import {
  invoiceLineBodySchema,
  invoiceMutationBodySchema,
} from "@/lib/invoice-mutation-schema";

import { CUSTOMER_ID, validCreateBody } from "../../mocks/invoice-store";

describe("invoice-mutation-schema", () => {
  describe("invoiceLineBodySchema", () => {
    it("accepts a valid line", () => {
      const parsed = invoiceLineBodySchema.safeParse({
        productName: "Widget",
        quantity: 2,
        unitPrice: 100,
        taxRate: 18,
      });
      expect(parsed.success).toBe(true);
    });

    it("coerces string quantity and unitPrice", () => {
      const parsed = invoiceLineBodySchema.safeParse({
        productName: "Widget",
        quantity: "3",
        unitPrice: "50.5",
        taxRate: 5,
      });
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.quantity).toBe(3);
        expect(parsed.data.unitPrice).toBe(50.5);
      }
    });

    it("rejects empty product name", () => {
      const parsed = invoiceLineBodySchema.safeParse({
        productName: "",
        quantity: 1,
        unitPrice: 10,
        taxRate: 0,
      });
      expect(parsed.success).toBe(false);
    });

    it("rejects non-positive quantity", () => {
      const parsed = invoiceLineBodySchema.safeParse({
        productName: "Widget",
        quantity: 0,
        unitPrice: 10,
        taxRate: 0,
      });
      expect(parsed.success).toBe(false);
    });

    it("rejects negative unit price", () => {
      const parsed = invoiceLineBodySchema.safeParse({
        productName: "Widget",
        quantity: 1,
        unitPrice: -1,
        taxRate: 0,
      });
      expect(parsed.success).toBe(false);
    });

    it("rejects invalid tax rate", () => {
      const parsed = invoiceLineBodySchema.safeParse({
        productName: "Widget",
        quantity: 1,
        unitPrice: 10,
        taxRate: 15,
      });
      expect(parsed.success).toBe(false);
    });
  });

  describe("invoiceMutationBodySchema", () => {
    it("accepts a valid mutation body", () => {
      const parsed = invoiceMutationBodySchema.safeParse(validCreateBody());
      expect(parsed.success).toBe(true);
    });

    it("accepts optional notes", () => {
      const parsed = invoiceMutationBodySchema.safeParse({
        ...validCreateBody(),
        notes: "Internal",
        customerNotes: null,
      });
      expect(parsed.success).toBe(true);
    });

    it("coerces discountValue from string", () => {
      const parsed = invoiceMutationBodySchema.safeParse({
        ...validCreateBody(),
        discountValue: "10",
      });
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.discountValue).toBe(10);
      }
    });

    it("rejects invalid customer id", () => {
      const parsed = invoiceMutationBodySchema.safeParse({
        ...validCreateBody(),
        customerId: "not-a-uuid",
      });
      expect(parsed.success).toBe(false);
    });

    it("rejects invalid issue date format", () => {
      const parsed = invoiceMutationBodySchema.safeParse({
        ...validCreateBody(),
        issueDate: "29-08-2026",
      });
      expect(parsed.success).toBe(false);
    });

    it("rejects invalid due date format", () => {
      const parsed = invoiceMutationBodySchema.safeParse({
        ...validCreateBody(),
        dueDate: "2026/09/28",
      });
      expect(parsed.success).toBe(false);
    });

    it("rejects empty lines array", () => {
      const parsed = invoiceMutationBodySchema.safeParse({
        ...validCreateBody(),
        lines: [],
      });
      expect(parsed.success).toBe(false);
    });

    it("rejects negative discount value", () => {
      const parsed = invoiceMutationBodySchema.safeParse({
        ...validCreateBody(),
        discountValue: -1,
      });
      expect(parsed.success).toBe(false);
    });

    it("rejects invalid discount mode", () => {
      const parsed = invoiceMutationBodySchema.safeParse({
        ...validCreateBody(),
        discountMode: "invalid",
      });
      expect(parsed.success).toBe(false);
    });

    it("accepts all allowed GST rates on lines", () => {
      for (const taxRate of [0, 5, 12, 18, 28] as const) {
        const parsed = invoiceMutationBodySchema.safeParse({
          ...validCreateBody(),
          lines: [{ productName: "Item", quantity: 1, unitPrice: 10, taxRate }],
        });
        expect(parsed.success).toBe(true);
      }
    });

    it("parses body with explicit customer id constant", () => {
      const parsed = invoiceMutationBodySchema.safeParse(
        validCreateBody(CUSTOMER_ID),
      );
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.customerId).toBe(CUSTOMER_ID);
      }
    });
  });
});
