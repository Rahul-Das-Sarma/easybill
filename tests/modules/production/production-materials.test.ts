import { describe, expect, it } from "vitest";

import {
  bomLinesToRecipeComponents,
  getProductionShortages,
  maxFinishedGoodQuantity,
  type ProductionBomLine,
} from "@/lib/production-materials";

const lines: ProductionBomLine[] = [
  {
    rawMaterialId: "rm-1",
    quantityPerUnit: 2,
    rawMaterial: { name: "Flour", quantity: 10 },
  },
  {
    rawMaterialId: "rm-2",
    quantityPerUnit: 1,
    rawMaterial: { name: "Sugar", quantity: 3 },
  },
];

describe("production-materials", () => {
  describe("getProductionShortages", () => {
    it("returns no shortages when quantity is zero", () => {
      expect(getProductionShortages(lines, 0)).toEqual([]);
    });

    it("returns no shortages when stock is sufficient", () => {
      expect(getProductionShortages(lines, 3)).toEqual([]);
    });

    it("reports shortages when raw materials are insufficient", () => {
      expect(getProductionShortages(lines, 4)).toEqual([
        { name: "Sugar", need: 4, have: 3 },
      ]);
    });

    it("reports all limiting materials", () => {
      expect(getProductionShortages(lines, 6)).toEqual([
        { name: "Flour", need: 12, have: 10 },
        { name: "Sugar", need: 6, have: 3 },
      ]);
    });
  });

  describe("maxFinishedGoodQuantity", () => {
    it("adds current stock to additional producible units", () => {
      const components = bomLinesToRecipeComponents(lines);
      expect(maxFinishedGoodQuantity(4, components)).toBe(7);
    });

    it("returns current quantity when no more can be produced", () => {
      const components = bomLinesToRecipeComponents([
        {
          rawMaterialId: "rm-1",
          quantityPerUnit: 2,
          rawMaterial: { name: "Flour", quantity: 0 },
        },
      ]);
      expect(maxFinishedGoodQuantity(4, components)).toBe(4);
    });
  });

  describe("bomLinesToRecipeComponents", () => {
    it("maps BOM lines to recipe stock components", () => {
      expect(bomLinesToRecipeComponents(lines)).toEqual([
        {
          rawMaterialId: "rm-1",
          name: "Flour",
          quantityPerUnit: 2,
          stock: 10,
        },
        {
          rawMaterialId: "rm-2",
          name: "Sugar",
          quantityPerUnit: 1,
          stock: 3,
        },
      ]);
    });
  });
});
