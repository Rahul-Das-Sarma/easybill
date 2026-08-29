import { beforeEach, describe, expect, it, vi } from "vitest";

import { computeInvoiceLines } from "@/lib/invoice-math";

import {
  createDefaultCustomer,
  createDefaultUser,
  CUSTOMER_ID,
  USER_ID,
  validCreateBody,
} from "../../mocks/invoice-store";

const mocks = vi.hoisted(() => {
  const { createRequire } = require("node:module") as typeof import("node:module");
  const req = createRequire(import.meta.url);
  const { createMockInvoicePrisma } =
    req("../../mocks/invoice-store.ts") as typeof import("../../mocks/invoice-store");
  return { mockPrisma: createMockInvoicePrisma() };
});

vi.mock("@/lib/prisma", () => ({ prisma: mocks.mockPrisma }));

import {
  buildInvoiceTotals,
  invoiceItemCreates,
  invoiceTotalsData,
} from "@/lib/invoice-mutation";

describe("invoice-mutation", () => {
  beforeEach(() => {
    mocks.mockPrisma.reset();
    mocks.mockPrisma.seedUser(createDefaultUser());
    mocks.mockPrisma.seedCustomer(createDefaultCustomer());
  });

  describe("buildInvoiceTotals", () => {
    it("computes intra-state totals for regular scheme", async () => {
      const result = await buildInvoiceTotals(USER_ID, validCreateBody());

      expect("error" in result).toBe(false);
      if (!("error" in result)) {
        expect(result.gstScheme).toBe("regular");
        expect(result.supplyType).toBe("intra");
        expect(result.breakdown.totalAmount).toBe(118);
        expect(result.breakdown.cgstAmount).toBe(9);
        expect(result.breakdown.sgstAmount).toBe(9);
      }
    });

    it("computes inter-state totals when states differ", async () => {
      mocks.mockPrisma.seedCustomer(
        createDefaultCustomer({ stateCode: "09", gstNumber: "09AABCU9603R1ZM" }),
      );

      const result = await buildInvoiceTotals(USER_ID, validCreateBody());

      expect("error" in result).toBe(false);
      if (!("error" in result)) {
        expect(result.supplyType).toBe("inter");
        expect(result.breakdown.igstAmount).toBe(18);
        expect(result.breakdown.cgstAmount).toBe(0);
      }
    });

    it("uses supply type none for composition scheme", async () => {
      mocks.mockPrisma.seedUser(
        createDefaultUser({ gstScheme: "composition", stateCode: "27" }),
      );

      const result = await buildInvoiceTotals(USER_ID, validCreateBody());

      expect("error" in result).toBe(false);
      if (!("error" in result)) {
        expect(result.gstScheme).toBe("composition");
        expect(result.supplyType).toBe("none");
        expect(result.breakdown.taxAmount).toBe(0);
      }
    });

    it("derives seller state from GSTIN when state code is missing", async () => {
      mocks.mockPrisma.seedUser(
        createDefaultUser({
          stateCode: null,
          gstNumber: "27AABCU9603R1ZM",
        }),
      );
      mocks.mockPrisma.seedCustomer(
        createDefaultCustomer({ stateCode: null, gstNumber: "27AABCU9603R1ZM" }),
      );

      const result = await buildInvoiceTotals(USER_ID, validCreateBody());

      expect("error" in result).toBe(false);
      if (!("error" in result)) {
        expect(result.supplyType).toBe("intra");
      }
    });

    it("derives customer state from GSTIN when state code is missing", async () => {
      mocks.mockPrisma.seedCustomer(
        createDefaultCustomer({
          stateCode: null,
          gstNumber: "09AABCU9603R1ZM",
        }),
      );

      const result = await buildInvoiceTotals(USER_ID, validCreateBody());

      expect("error" in result).toBe(false);
      if (!("error" in result)) {
        expect(result.supplyType).toBe("inter");
      }
    });

    it("defaults gst scheme to regular when seller is missing", async () => {
      mocks.mockPrisma.reset();
      mocks.mockPrisma.seedCustomer(createDefaultCustomer());

      const result = await buildInvoiceTotals(USER_ID, validCreateBody());

      expect("error" in result).toBe(false);
      if (!("error" in result)) {
        expect(result.gstScheme).toBe("regular");
      }
    });

    it("handles seller and customer without state or GSTIN", async () => {
      mocks.mockPrisma.seedUser(
        createDefaultUser({ stateCode: null, gstNumber: null }),
      );
      mocks.mockPrisma.seedCustomer(
        createDefaultCustomer({ stateCode: null, gstNumber: null }),
      );

      const result = await buildInvoiceTotals(USER_ID, validCreateBody());

      expect("error" in result).toBe(false);
      if (!("error" in result)) {
        expect(result.supplyType).toBe("intra");
        expect(result.breakdown.totalAmount).toBe(118);
      }
    });

    it("returns FORBIDDEN when customer is not owned", async () => {
      const result = await buildInvoiceTotals(
        USER_ID,
        validCreateBody("44444444-4444-4444-8444-444444444444"),
      );

      expect(result).toEqual({ error: "FORBIDDEN" });
    });

    it("returns EMPTY_LINES when lines have no taxable value", async () => {
      const result = await buildInvoiceTotals(USER_ID, {
        ...validCreateBody(),
        lines: [{ productName: "Free", quantity: 1, unitPrice: 0, taxRate: 0 }],
      });

      expect(result).toEqual({ error: "EMPTY_LINES" });
    });

    it("trims product names before computing totals", async () => {
      const result = await buildInvoiceTotals(USER_ID, {
        ...validCreateBody(),
        lines: [
          { productName: "  Widget  ", quantity: 1, unitPrice: 100, taxRate: 18 },
        ],
      });

      expect("error" in result).toBe(false);
      if (!("error" in result)) {
        expect(result.breakdown.items[0]?.productName).toBe("Widget");
      }
    });
  });

  describe("invoiceItemCreates", () => {
    it("maps computed lines to Prisma decimal create payloads", () => {
      const breakdown = computeInvoiceLines(
        [{ productName: "  Service ", quantity: 2, unitPrice: 50, taxRate: 18 }],
        "flat",
        0,
        { gstScheme: "regular", supplyType: "intra" },
      );

      const items = invoiceItemCreates(breakdown.items);

      expect(items).toHaveLength(1);
      expect(items[0]?.productName).toBe("Service");
      expect(Number(items[0]?.quantity)).toBe(2);
      expect(Number(items[0]?.unitPrice)).toBe(50);
      expect(Number(items[0]?.taxRate)).toBe(18);
      expect(Number(items[0]?.total)).toBe(118);
      expect(items[0]?.sortOrder).toBe(0);
    });
  });

  describe("invoiceTotalsData", () => {
    it("maps breakdown totals to invoice update fields", () => {
      const breakdown = computeInvoiceLines(
        [{ productName: "Item", quantity: 1, unitPrice: 1000, taxRate: 18 }],
        "percent",
        10,
        { gstScheme: "regular", supplyType: "inter" },
      );

      const totals = invoiceTotalsData(breakdown, "regular", "inter");

      expect(Number(totals.subtotal)).toBe(900);
      expect(Number(totals.discountAmount)).toBe(100);
      expect(Number(totals.taxAmount)).toBe(162);
      expect(Number(totals.igstAmount)).toBe(162);
      expect(Number(totals.totalAmount)).toBe(1062);
      expect(totals.gstSchemeAtIssue).toBe("regular");
      expect(totals.supplyType).toBe("inter");
    });

    it("preserves composition scheme metadata", () => {
      const breakdown = computeInvoiceLines(
        [{ productName: "Item", quantity: 1, unitPrice: 500, taxRate: 18 }],
        "flat",
        0,
        { gstScheme: "composition", supplyType: "none" },
      );

      const totals = invoiceTotalsData(breakdown, "composition", "none");

      expect(totals.gstSchemeAtIssue).toBe("composition");
      expect(totals.supplyType).toBe("none");
      expect(Number(totals.taxAmount)).toBe(0);
    });
  });
});
