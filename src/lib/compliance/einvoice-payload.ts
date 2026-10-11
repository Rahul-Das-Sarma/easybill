export type EinvoiceParty = {
  gstin: string;
  legalName: string;
  address: string;
  city: string;
  pincode: string;
  stateCode: string;
};

export type EinvoiceLine = {
  productName: string;
  hsnCode: string | null;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  taxableValue: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  total: number;
};

export type EinvoiceInput = {
  invoiceNumber: string;
  issueDate: string;
  supplyType: "intra" | "inter" | "none";
  seller: EinvoiceParty;
  buyer: EinvoiceParty;
  lines: EinvoiceLine[];
  taxableValue: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalAmount: number;
};

function ddMmYyyy(isoDate: string) {
  const [year, month, day] = isoDate.slice(0, 10).split("-");
  return `${day}/${month}/${year}`;
}

function money(n: number) {
  return Math.round(n * 100) / 100;
}

function docNo(invoiceNumber: string) {
  return invoiceNumber.replace(/[^A-Za-z0-9/-]/g, "").slice(0, 16);
}

export function einvoiceReadiness(input: EinvoiceInput): string[] {
  const errors: string[] = [];
  if (!/^[0-9]{2}[A-Z0-9]{13}$/.test(input.seller.gstin)) {
    errors.push("Seller GSTIN is missing or invalid.");
  }
  if (!/^[0-9]{2}[A-Z0-9]{13}$/.test(input.buyer.gstin)) {
    errors.push("Buyer GSTIN is required for an e-invoice.");
  }
  if (!/^\d{6}$/.test(input.seller.pincode)) {
    errors.push("Add your 6-digit PIN code in Settings.");
  }
  if (!input.seller.city.trim()) {
    errors.push("Add your city in Settings.");
  }
  if (!/^\d{6}$/.test(input.buyer.pincode)) {
    errors.push("Add the customer's 6-digit PIN code.");
  }
  if (!input.seller.address.trim() || !input.buyer.address.trim()) {
    errors.push("Seller and buyer addresses are required.");
  }
  if (!docNo(input.invoiceNumber)) {
    errors.push("Invoice number cannot be used on the IRP.");
  }
  input.lines.forEach((line, index) => {
    if (!line.hsnCode || !/^\d{4,8}$/.test(line.hsnCode)) {
      errors.push(`Line ${index + 1} needs a 4 to 8 digit HSN code.`);
    }
  });
  return errors;
}

/** NIC e-invoice schema 1.1 payload, before encryption. */
export function buildEinvoicePayload(input: EinvoiceInput) {
  return {
    Version: "1.1",
    TranDtls: {
      TaxSch: "GST",
      SupTyp: "B2B",
      RegRev: "N",
      IgstOnIntra: "N",
    },
    DocDtls: {
      Typ: "INV",
      No: docNo(input.invoiceNumber),
      Dt: ddMmYyyy(input.issueDate),
    },
    SellerDtls: {
      Gstin: input.seller.gstin,
      LglNm: input.seller.legalName.slice(0, 100),
      Addr1: input.seller.address.slice(0, 100),
      Loc: input.seller.city.slice(0, 50),
      Pin: Number(input.seller.pincode),
      Stcd: input.seller.stateCode,
    },
    BuyerDtls: {
      Gstin: input.buyer.gstin,
      LglNm: input.buyer.legalName.slice(0, 100),
      Pos: input.buyer.stateCode,
      Addr1: input.buyer.address.slice(0, 100),
      Loc: input.buyer.city || input.buyer.stateCode,
      Pin: Number(input.buyer.pincode),
      Stcd: input.buyer.stateCode,
    },
    ItemList: input.lines.map((line, index) => ({
      SlNo: String(index + 1),
      PrdDesc: line.productName.slice(0, 300),
      IsServc: "N",
      HsnCd: line.hsnCode,
      Qty: line.quantity,
      Unit: "NOS",
      UnitPrice: money(line.unitPrice),
      TotAmt: money(line.quantity * line.unitPrice),
      AssAmt: money(line.taxableValue),
      GstRt: line.taxRate,
      IgstAmt: money(line.igstAmount),
      CgstAmt: money(line.cgstAmount),
      SgstAmt: money(line.sgstAmount),
      TotItemVal: money(line.total),
    })),
    ValDtls: {
      AssVal: money(input.taxableValue),
      CgstVal: money(input.cgstAmount),
      SgstVal: money(input.sgstAmount),
      IgstVal: money(input.igstAmount),
      TotInvVal: money(input.totalAmount),
    },
  };
}
