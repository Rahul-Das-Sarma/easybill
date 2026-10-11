import { describe, expect, it } from "vitest";

import {
  buildEinvoicePayload,
  einvoiceReadiness,
  type EinvoiceInput,
} from "@/lib/compliance/einvoice-payload";

const input: EinvoiceInput = {
  invoiceNumber: "INV/2026/1",
  issueDate: "2026-10-11",
  supplyType: "intra",
  seller: {
    gstin: "27AAAAA0000A1Z5",
    legalName: "Acme Traders",
    address: "Pune",
    city: "Pune",
    pincode: "411001",
    stateCode: "27",
  },
  buyer: {
    gstin: "29BBBBB0000B1Z5",
    legalName: "Buyer Co",
    address: "Bengaluru",
    city: "Bengaluru",
    pincode: "560001",
    stateCode: "29",
  },
  lines: [
    {
      productName: "Widget",
      hsnCode: "8471",
      quantity: 2,
      unitPrice: 100,
      taxRate: 18,
      taxableValue: 200,
      cgstAmount: 0,
      sgstAmount: 0,
      igstAmount: 36,
      total: 236,
    },
  ],
  taxableValue: 200,
  cgstAmount: 0,
  sgstAmount: 0,
  igstAmount: 36,
  totalAmount: 236,
};

describe("e-invoice payload", () => {
  it("builds the NIC document", () => {
    const payload = buildEinvoicePayload(input);
    expect(payload.DocDtls).toEqual({
      Typ: "INV",
      No: "INV/2026/1",
      Dt: "11/10/2026",
    });
    expect(payload.ItemList[0]?.HsnCd).toBe("8471");
    expect(payload.ValDtls.TotInvVal).toBe(236);
    expect(einvoiceReadiness(input)).toEqual([]);
  });

  it("lists missing HSN and PIN codes", () => {
    const errors = einvoiceReadiness({
      ...input,
      seller: { ...input.seller, pincode: "" },
      lines: [{ ...input.lines[0]!, hsnCode: null }],
    });
    expect(errors.join(" ")).toMatch(/PIN code/);
    expect(errors.join(" ")).toMatch(/HSN/);
  });
});
