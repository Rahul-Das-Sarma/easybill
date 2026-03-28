export type InvoicePdfPayload = {
  plan: "free" | "pro";
  business: {
    name: string;
    companyName: string;
    email: string;
    address: string;
    phone: string | null;
    gstNumber: string | null;
    logoUrl: string | null;
  };
  customer: {
    name: string;
    email: string | null;
    address: string | null;
    gstNumber: string | null;
    phone: string | null;
  };
  invoice: {
    id: string;
    invoiceNumber: string;
    status: string;
    issueDate: string;
    dueDate: string;
    customerNotes: string | null;
    subtotal: string;
    discountAmount: string;
    taxAmount: string;
    totalAmount: string;
    amountPaid: string;
    currency: string;
  };
  items: Array<{
    productName: string;
    quantity: string;
    unitPrice: string;
    taxRate: string;
    taxAmount: string;
    total: string;
    sortOrder: number;
  }>;
};
