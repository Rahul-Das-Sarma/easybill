import { describe, expect, it } from "vitest";

import { computeInvoiceLines, GST_RATES } from "@/lib/invoice-math";

describe("invoice-math", () => {
  describe("GST_RATES", () => {
    it("exports allowed GST slabs", () => {
      expect(GST_RATES).toEqual([0, 5, 12, 18, 28]);
    });
  });

  describe("computeInvoiceLines — regular intra-state", () => {
    it("computes CGST+SGST for a single line", () => {
      const result = computeInvoiceLines(
        [{ productName: "Widget", quantity: 2, unitPrice: 100, taxRate: 18 }],
        "flat",
        0,
        { gstScheme: "regular", supplyType: "intra" },
      );

      expect(result.preDiscountSubtotal).toBe(200);
      expect(result.subtotal).toBe(200);
      expect(result.discountAmount).toBe(0);
      expect(result.taxAmount).toBe(36);
      expect(result.cgstAmount).toBe(18);
      expect(result.sgstAmount).toBe(18);
      expect(result.igstAmount).toBe(0);
      expect(result.totalAmount).toBe(236);
      expect(result.items[0]?.lineTotal).toBe(236);
    });

    it("computes IGST for inter-state supply", () => {
      const result = computeInvoiceLines(
        [{ productName: "Widget", quantity: 1, unitPrice: 1000, taxRate: 18 }],
        "flat",
        0,
        { gstScheme: "regular", supplyType: "inter" },
      );

      expect(result.taxAmount).toBe(180);
      expect(result.cgstAmount).toBe(0);
      expect(result.sgstAmount).toBe(0);
      expect(result.igstAmount).toBe(180);
      expect(result.totalAmount).toBe(1180);
    });
  });

  describe("computeInvoiceLines — discounts", () => {
    it("applies flat discount capped at subtotal", () => {
      const result = computeInvoiceLines(
        [{ productName: "A", quantity: 1, unitPrice: 100, taxRate: 18 }],
        "flat",
        150,
        { gstScheme: "regular", supplyType: "intra" },
      );

      expect(result.discountAmount).toBe(100);
      expect(result.subtotal).toBe(0);
      expect(result.taxAmount).toBe(0);
      expect(result.totalAmount).toBe(0);
    });

    it("applies percent discount", () => {
      const result = computeInvoiceLines(
        [{ productName: "A", quantity: 1, unitPrice: 200, taxRate: 18 }],
        "percent",
        10,
        { gstScheme: "regular", supplyType: "intra" },
      );

      expect(result.discountAmount).toBe(20);
      expect(result.subtotal).toBe(180);
      expect(result.taxAmount).toBe(32.4);
      expect(result.totalAmount).toBe(212.4);
    });

    it("caps percent discount at 100%", () => {
      const result = computeInvoiceLines(
        [{ productName: "A", quantity: 1, unitPrice: 100, taxRate: 18 }],
        "percent",
        200,
        { gstScheme: "regular", supplyType: "intra" },
      );

      expect(result.discountAmount).toBe(100);
      expect(result.subtotal).toBe(0);
    });

    it("ignores negative discount values", () => {
      const result = computeInvoiceLines(
        [{ productName: "A", quantity: 1, unitPrice: 100, taxRate: 18 }],
        "flat",
        -50,
        { gstScheme: "regular", supplyType: "intra" },
      );

      expect(result.discountAmount).toBe(0);
    });
  });

  describe("computeInvoiceLines — non-regular schemes", () => {
    it("charges no GST for composition scheme", () => {
      const result = computeInvoiceLines(
        [{ productName: "A", quantity: 1, unitPrice: 500, taxRate: 18 }],
        "flat",
        0,
        { gstScheme: "composition" },
      );

      expect(result.supplyType).toBe("none");
      expect(result.taxAmount).toBe(0);
      expect(result.totalAmount).toBe(500);
    });

    it("charges no GST for unregistered scheme", () => {
      const result = computeInvoiceLines(
        [{ productName: "A", quantity: 1, unitPrice: 300, taxRate: 18 }],
        "flat",
        0,
        { gstScheme: "unregistered" },
      );

      expect(result.taxAmount).toBe(0);
      expect(result.totalAmount).toBe(300);
    });
  });

  describe("computeInvoiceLines — line normalization", () => {
    it("zeroes lines with empty product name or non-positive quantity", () => {
      const result = computeInvoiceLines(
        [
          { productName: "  ", quantity: 5, unitPrice: 100, taxRate: 18 },
          { productName: "Valid", quantity: 0, unitPrice: 100, taxRate: 18 },
          { productName: "Good", quantity: 1, unitPrice: 100, taxRate: 18 },
        ],
        "flat",
        0,
      );

      expect(result.preDiscountSubtotal).toBe(100);
      expect(result.items).toHaveLength(3);
      expect(result.items[2]?.lineSubtotal).toBe(100);
    });

    it("clamps negative unit prices to zero", () => {
      const result = computeInvoiceLines(
        [{ productName: "A", quantity: 1, unitPrice: -50, taxRate: 18 }],
        "flat",
        0,
      );

      expect(result.preDiscountSubtotal).toBe(0);
    });

    it("defaults invalid tax rate to 18%", () => {
      const result = computeInvoiceLines(
        [
          {
            productName: "A",
            quantity: 1,
            unitPrice: 100,
            taxRate: 99 as 18,
          },
        ],
        "flat",
        0,
        { gstScheme: "regular", supplyType: "intra" },
      );

      expect(result.taxAmount).toBe(18);
    });

    it("defaults supply type to intra for regular scheme", () => {
      const result = computeInvoiceLines(
        [{ productName: "A", quantity: 1, unitPrice: 100, taxRate: 18 }],
        "flat",
        0,
        { gstScheme: "regular" },
      );

      expect(result.supplyType).toBe("intra");
      expect(result.cgstAmount).toBe(9);
      expect(result.sgstAmount).toBe(9);
    });
  });

  describe("computeInvoiceLines — multi-line proportional discount", () => {
    it("distributes discount proportionally across lines", () => {
      const result = computeInvoiceLines(
        [
          { productName: "A", quantity: 1, unitPrice: 100, taxRate: 18 },
          { productName: "B", quantity: 1, unitPrice: 100, taxRate: 18 },
        ],
        "flat",
        50,
        { gstScheme: "regular", supplyType: "intra" },
      );

      expect(result.discountAmount).toBe(50);
      expect(result.subtotal).toBe(150);
      expect(result.items[0]?.lineSubtotal).toBe(75);
      expect(result.items[1]?.lineSubtotal).toBe(75);
    });
  });

  describe("computeInvoiceLines — zero GST rate", () => {
    it("produces zero tax with 0% slab", () => {
      const result = computeInvoiceLines(
        [{ productName: "Exempt", quantity: 1, unitPrice: 1000, taxRate: 0 }],
        "flat",
        0,
        { gstScheme: "regular", supplyType: "intra" },
      );

      expect(result.taxAmount).toBe(0);
      expect(result.cgstAmount).toBe(0);
      expect(result.sgstAmount).toBe(0);
      expect(result.totalAmount).toBe(1000);
    });
  });

  describe("computeInvoiceLines — empty invoice", () => {
    it("returns zeros when all lines are effectively empty", () => {
      const result = computeInvoiceLines([], "flat", 0);

      expect(result.preDiscountSubtotal).toBe(0);
      expect(result.subtotal).toBe(0);
      expect(result.totalAmount).toBe(0);
      expect(result.items).toHaveLength(0);
    });
  });
});
