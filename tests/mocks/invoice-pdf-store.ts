import { vi } from "vitest";

import {
  createDefaultCustomer,
  createDefaultUser,
  createMockInvoice,
  CUSTOMER_ID,
  d,
  USER_ID,
} from "./invoice-store.ts";

export { USER_ID, CUSTOMER_ID };

export type MockPdfUser = ReturnType<typeof createDefaultPdfUser>;
export type MockPdfInvoice = ReturnType<typeof createMockInvoice> & {
  pdfUrl?: string | null;
};

export function createDefaultPdfUser(
  overrides?: Partial<MockPdfUser>,
): MockPdfUser {
  return {
    ...createDefaultUser(),
    name: "Rahul Owner",
    companyName: "Acme Traders Pvt Ltd",
    email: "owner@acme.com",
    address: "12 MG Road, Pune",
    phone: "9876543210",
    companyLogoUrl: "https://cdn.example.com/logo.png",
    plan: "free",
    ...overrides,
  };
}

export function createSamplePdfPayload(
  overrides?: Partial<import("@/lib/invoice-pdf/types").InvoicePdfPayload>,
): import("@/lib/invoice-pdf/types").InvoicePdfPayload {
  return {
    plan: "free",
    business: {
      name: "Rahul Owner",
      companyName: "Acme Traders Pvt Ltd",
      email: "owner@acme.com",
      address: "12 MG Road, Pune",
      phone: "9876543210",
      gstNumber: "27AABCU9603R1ZM",
      logoUrl: "https://cdn.example.com/logo.png",
    },
    customer: {
      name: "Buyer Co",
      email: "buyer@example.com",
      address: "Mumbai",
      gstNumber: "27AABCU9603R1ZX",
      phone: "8888888888",
    },
    invoice: {
      id: "invoice-pdf-1",
      invoiceNumber: "INV-2026-001",
      status: "pending",
      issueDate: "2026-08-29",
      dueDate: "2026-09-28",
      customerNotes: "Thank you for your business.",
      subtotal: "1000.00",
      discountAmount: "0.00",
      taxAmount: "180.00",
      cgstAmount: "90.00",
      sgstAmount: "90.00",
      igstAmount: "0.00",
      totalAmount: "1180.00",
      amountPaid: "0.00",
      currency: "INR",
      gstSchemeAtIssue: "regular",
      supplyType: "intra",
    },
    items: [
      {
        productName: "Widget",
        quantity: "1.00",
        unitPrice: "1000.00",
        taxRate: "18.00",
        taxAmount: "180.00",
        cgstAmount: "90.00",
        sgstAmount: "90.00",
        igstAmount: "0.00",
        total: "1180.00",
        sortOrder: 0,
      },
    ],
    ...overrides,
  };
}

export function createMockInvoicePdfPrisma() {
  const users = new Map<string, MockPdfUser>();
  const customers = new Map<string, ReturnType<typeof createDefaultCustomer>>();
  const invoices = new Map<string, MockPdfInvoice>();
  const items = new Map<
    string,
    {
      id: string;
      invoiceId: string;
      productName: string;
      quantity: ReturnType<typeof d>;
      unitPrice: ReturnType<typeof d>;
      taxRate: ReturnType<typeof d>;
      taxAmount: ReturnType<typeof d>;
      cgstAmount: ReturnType<typeof d>;
      sgstAmount: ReturnType<typeof d>;
      igstAmount: ReturnType<typeof d>;
      total: ReturnType<typeof d>;
      sortOrder: number;
    }
  >();

  const invoice = {
    findFirst: vi.fn(
      async ({
        where,
        include,
        select,
      }: {
        where: { id?: string; userId?: string };
        include?: {
          customer?: boolean;
          user?: boolean;
          items?: { orderBy?: { sortOrder: "asc" | "desc" } };
        };
        select?: Record<string, boolean>;
      }) => {
        const row = [...invoices.values()].find((inv) => {
          if (where.id && inv.id !== where.id) return false;
          if (where.userId && inv.userId !== where.userId) return false;
          return true;
        });
        if (!row) return null;

        if (select) {
          return Object.fromEntries(
            Object.keys(select).map((key) => [key, row[key as keyof typeof row]]),
          );
        }

        const base = { ...row };
        if (include?.user) {
          Object.assign(base, { user: users.get(row.userId) });
        }
        if (include?.customer) {
          Object.assign(base, { customer: customers.get(row.customerId) });
        }
        if (include?.items) {
          const lineItems = [...items.values()]
            .filter((item) => item.invoiceId === row.id)
            .sort((a, b) => a.sortOrder - b.sortOrder);
          Object.assign(base, { items: lineItems });
        }
        return base;
      },
    ),
    update: vi.fn(
      async ({
        where,
        data,
      }: {
        where: { id: string };
        data: Partial<MockPdfInvoice>;
      }) => {
        const row = invoices.get(where.id);
        if (!row) throw new Error("not found");
        Object.assign(row, data);
        invoices.set(where.id, row);
        return row;
      },
    ),
  };

  return {
    invoice,
    seedUser(row: MockPdfUser) {
      users.set(row.id, row);
    },
    seedCustomer(row: ReturnType<typeof createDefaultCustomer>) {
      customers.set(row.id, row);
    },
    seedInvoice(
      row: MockPdfInvoice,
      lineItems?: Array<Omit<(typeof items extends Map<string, infer V> ? V : never), "id" | "invoiceId">>,
    ) {
      invoices.set(row.id, row);
      lineItems?.forEach((item, index) => {
        const id = `pdf-item-${row.id}-${index}`;
        items.set(id, {
          id,
          invoiceId: row.id,
          sortOrder: index,
          ...item,
        });
      });
    },
    reset() {
      users.clear();
      customers.clear();
      invoices.clear();
      items.clear();
      vi.clearAllMocks();
    },
    _invoices: invoices,
  };
}

export function seedDefaultPdfInvoice(
  prisma: ReturnType<typeof createMockInvoicePdfPrisma>,
  invoiceId = "invoice-pdf-1",
) {
  prisma.seedUser(createDefaultPdfUser());
  prisma.seedCustomer(createDefaultCustomer());
  prisma.seedInvoice(
    {
      ...createMockInvoice({
        id: invoiceId,
        invoiceNumber: "INV-2026-001",
        status: "pending",
        gstSchemeAtIssue: "regular",
        supplyType: "intra",
        customerNotes: "Thank you for your business.",
      }),
      pdfUrl: null,
    },
    [
      {
        productName: "Widget",
        quantity: d(1),
        unitPrice: d(1000),
        taxRate: d(18),
        taxAmount: d(180),
        cgstAmount: d(90),
        sgstAmount: d(90),
        igstAmount: d(0),
        total: d(1180),
        sortOrder: 0,
      },
    ],
  );
}
