import { describe, expect, it } from "vitest";

import {
  COMPOSITION_DISCLAIMER,
  GST_SCHEMES,
  INDIAN_STATE_CODES,
  invoiceTitleForScheme,
  resolveSupplyType,
  stateCodeFromGstin,
  stateNameFromCode,
} from "@/lib/gst-india";

describe("gst-india", () => {
  describe("stateCodeFromGstin", () => {
    it("extracts first two digits from a valid GSTIN", () => {
      expect(stateCodeFromGstin("27AABCU9603R1ZM")).toBe("27");
      expect(stateCodeFromGstin("  07abcde1234f1z5  ")).toBe("07");
    });

    it("returns null for missing, short, or non-numeric prefix", () => {
      expect(stateCodeFromGstin(null)).toBeNull();
      expect(stateCodeFromGstin(undefined)).toBeNull();
      expect(stateCodeFromGstin("")).toBeNull();
      expect(stateCodeFromGstin("A")).toBeNull();
      expect(stateCodeFromGstin("AB123")).toBeNull();
    });
  });

  describe("stateNameFromCode", () => {
    it("resolves known state codes", () => {
      expect(stateNameFromCode("27")).toBe("Maharashtra");
      expect(stateNameFromCode("07")).toBe("Delhi");
    });

    it("returns null for unknown or empty codes", () => {
      expect(stateNameFromCode(null)).toBeNull();
      expect(stateNameFromCode(undefined)).toBeNull();
      expect(stateNameFromCode("99")).toBeNull();
    });
  });

  describe("resolveSupplyType", () => {
    it("returns intra when states match", () => {
      expect(resolveSupplyType("27", "27")).toBe("intra");
    });

    it("returns inter when states differ", () => {
      expect(resolveSupplyType("27", "07")).toBe("inter");
    });

    it("defaults to intra when either state is missing", () => {
      expect(resolveSupplyType(null, "27")).toBe("intra");
      expect(resolveSupplyType("27", null)).toBe("intra");
      expect(resolveSupplyType(undefined, undefined)).toBe("intra");
    });
  });

  describe("invoiceTitleForScheme", () => {
    it("returns correct titles per scheme", () => {
      expect(invoiceTitleForScheme("regular")).toBe("Tax Invoice");
      expect(invoiceTitleForScheme("composition")).toBe("Bill of Supply");
      expect(invoiceTitleForScheme("unregistered")).toBe("Invoice");
    });
  });

  describe("constants", () => {
    it("exports GST scheme metadata", () => {
      expect(GST_SCHEMES).toHaveLength(3);
      expect(GST_SCHEMES.map((s) => s.value)).toEqual([
        "regular",
        "composition",
        "unregistered",
      ]);
    });

    it("exports Indian state codes list", () => {
      expect(INDIAN_STATE_CODES.length).toBeGreaterThan(30);
      expect(INDIAN_STATE_CODES.some((s) => s.code === "27")).toBe(true);
    });

    it("exports composition disclaimer", () => {
      expect(COMPOSITION_DISCLAIMER).toContain("Composition");
    });
  });
});
