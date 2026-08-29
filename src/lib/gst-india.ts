/** Indian GST helpers — state codes, scheme labels, supply type. */

export type GstScheme = "regular" | "composition" | "unregistered";
export type SupplyType = "intra" | "inter" | "none";

export const GST_SCHEMES: {
  value: GstScheme;
  label: string;
  description: string;
}[] = [
  {
    value: "regular",
    label: "Regular GST",
    description: "Collect CGST+SGST or IGST on invoices. Claim input tax credit.",
  },
  {
    value: "composition",
    label: "Composition scheme",
    description: "Do not collect tax on bills. Show composition disclaimer.",
  },
  {
    value: "unregistered",
    label: "Not registered",
    description: "Below GST threshold — simple bills without GST.",
  },
];

/** GST state codes (first 2 digits of GSTIN). */
export const INDIAN_STATE_CODES: { code: string; name: string }[] = [
  { code: "01", name: "Jammu & Kashmir" },
  { code: "02", name: "Himachal Pradesh" },
  { code: "03", name: "Punjab" },
  { code: "04", name: "Chandigarh" },
  { code: "05", name: "Uttarakhand" },
  { code: "06", name: "Haryana" },
  { code: "07", name: "Delhi" },
  { code: "08", name: "Rajasthan" },
  { code: "09", name: "Uttar Pradesh" },
  { code: "10", name: "Bihar" },
  { code: "11", name: "Sikkim" },
  { code: "12", name: "Arunachal Pradesh" },
  { code: "13", name: "Nagaland" },
  { code: "14", name: "Manipur" },
  { code: "15", name: "Mizoram" },
  { code: "16", name: "Tripura" },
  { code: "17", name: "Meghalaya" },
  { code: "18", name: "Assam" },
  { code: "19", name: "West Bengal" },
  { code: "20", name: "Jharkhand" },
  { code: "21", name: "Odisha" },
  { code: "22", name: "Chhattisgarh" },
  { code: "23", name: "Madhya Pradesh" },
  { code: "24", name: "Gujarat" },
  { code: "26", name: "Dadra & Nagar Haveli and Daman & Diu" },
  { code: "27", name: "Maharashtra" },
  { code: "29", name: "Karnataka" },
  { code: "30", name: "Goa" },
  { code: "32", name: "Kerala" },
  { code: "33", name: "Tamil Nadu" },
  { code: "34", name: "Puducherry" },
  { code: "35", name: "Andaman & Nicobar" },
  { code: "36", name: "Telangana" },
  { code: "37", name: "Andhra Pradesh" },
  { code: "38", name: "Ladakh" },
];

export function stateCodeFromGstin(
  gstin: string | null | undefined,
): string | null {
  const t = gstin?.trim().toUpperCase();
  if (!t || t.length < 2) return null;
  const code = t.slice(0, 2);
  return /^\d{2}$/.test(code) ? code : null;
}

export function stateNameFromCode(code: string | null | undefined): string | null {
  if (!code) return null;
  return INDIAN_STATE_CODES.find((s) => s.code === code)?.name ?? null;
}

export function resolveSupplyType(
  sellerState: string | null | undefined,
  buyerState: string | null | undefined,
): SupplyType {
  if (!sellerState || !buyerState) return "intra";
  return sellerState === buyerState ? "intra" : "inter";
}

export function invoiceTitleForScheme(scheme: GstScheme): string {
  if (scheme === "regular") return "Tax Invoice";
  if (scheme === "composition") return "Bill of Supply";
  return "Invoice";
}

export const COMPOSITION_DISCLAIMER =
  "Composition taxable person — not eligible to collect tax on supplies.";
