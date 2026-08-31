import { describe, expect, it } from "vitest";

import {
  coerceNumberInput,
  formatNumberInputDisplay,
  isEmptyNumberValue,
  parseNumberInputValue,
} from "@/lib/number-input";

describe("number-input", () => {
  describe("coerceNumberInput", () => {
    it("returns fallback for empty values", () => {
      expect(coerceNumberInput("")).toBe(0);
      expect(coerceNumberInput(null)).toBe(0);
      expect(coerceNumberInput(undefined)).toBe(0);
      expect(coerceNumberInput("", 5)).toBe(5);
    });

    it("parses numeric strings and numbers", () => {
      expect(coerceNumberInput("12.5")).toBe(12.5);
      expect(coerceNumberInput(7)).toBe(7);
    });

    it("returns fallback for non-finite values", () => {
      expect(coerceNumberInput("abc")).toBe(0);
      expect(coerceNumberInput("abc", 3)).toBe(3);
    });
  });

  describe("parseNumberInputValue", () => {
    it("parses raw input strings", () => {
      expect(parseNumberInputValue("18")).toBe(18);
      expect(parseNumberInputValue("")).toBe(0);
    });
  });

  describe("isEmptyNumberValue", () => {
    it("treats empty and zero as empty", () => {
      expect(isEmptyNumberValue("")).toBe(true);
      expect(isEmptyNumberValue(null)).toBe(true);
      expect(isEmptyNumberValue(0)).toBe(true);
      expect(isEmptyNumberValue("0")).toBe(true);
    });

    it("treats positive numbers as non-empty", () => {
      expect(isEmptyNumberValue(1)).toBe(false);
      expect(isEmptyNumberValue("2")).toBe(false);
    });
  });

  describe("formatNumberInputDisplay", () => {
    it("shows blank for empty zero values when requested", () => {
      expect(formatNumberInputDisplay(0, true)).toBe("");
      expect(formatNumberInputDisplay("", true)).toBe("");
    });

    it("shows zero when emptyZero is false", () => {
      expect(formatNumberInputDisplay(0, false)).toBe("0");
    });

    it("formats finite numbers as strings", () => {
      expect(formatNumberInputDisplay(18000, true)).toBe("18000");
      expect(formatNumberInputDisplay("4.5", false)).toBe("4.5");
    });
  });
});
