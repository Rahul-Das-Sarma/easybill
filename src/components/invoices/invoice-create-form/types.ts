export type InvoiceCustomerSearchHit = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  gstNumber: string | null;
  stateCode: string | null;
};

export type InvoiceGstProfile = {
  gstScheme: "regular" | "composition" | "unregistered";
  stateCode: string | null;
  gstNumber: string | null;
};
