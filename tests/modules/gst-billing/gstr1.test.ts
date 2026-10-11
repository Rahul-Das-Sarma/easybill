import { describe, expect, it } from "vitest";

import { buildGstr1 } from "@/lib/compliance/gstr1";

describe("GSTR-1", () => {
  it("groups B2B invoices by buyer GSTIN and puts the rest in B2CS", () => {
    const payload = buildGstr1({
      gstin: "27AAAAA0000A1Z5",
      month: "2026-10",
      invoices: [
        {
          invoiceNumber: "INV-1",
          issueDate: "2026-10-11",
          buyerGstin: "29BBBBB0000B1Z5",
          placeOfSupply: "29",
          totalAmount: 1180,
          lines: [
            {
              taxRate: 18,
              taxableValue: 1000,
              cgstAmount: 0,
              sgstAmount: 0,
              igstAmount: 180,
            },
          ],
        },
        {
          invoiceNumber: "INV-2",
          issueDate: "2026-10-12",
          buyerGstin: null,
          placeOfSupply: "27",
          totalAmount: 118,
          lines: [
            {
              taxRate: 18,
              taxableValue: 100,
              cgstAmount: 9,
              sgstAmount: 9,
              igstAmount: 0,
            },
          ],
        },
      ],
    });

    expect(payload.fp).toBe("102026");
    expect(payload.b2b).toEqual([
      expect.objectContaining({
        ctin: "29BBBBB0000B1Z5",
        inv: [expect.objectContaining({ inum: "INV-1", idt: "11-10-2026" })],
      }),
    ]);
    expect(payload.b2cs).toEqual([
      expect.objectContaining({
        sply_ty: "INTRA",
        pos: "27",
        rt: 18,
        txval: 100,
      }),
    ]);
  });
});