import { vi } from "vitest";

export const USER_ID = "11111111-1111-4111-8111-111111111111";
export const CUSTOMER_ID = "22222222-2222-4222-8222-222222222222";
export const OTHER_CUSTOMER_ID = "33333333-3333-4333-8333-333333333333";

export type MockUser = {
  id: string;
  gstScheme: "regular" | "composition" | "unregistered";
  stateCode: string | null;
  gstNumber: string | null;
  invoicePrefix: string;
};

export type MockCustomer = {
  id: string;
  userId: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  gstNumber: string | null;
  stateCode: string | null;
};

export type MockInvoiceItem = {
  id: string;
  invoiceId: string;
  productName: string;
  quantity: MockDecimal;
  unitPrice: MockDecimal;
  taxRate: MockDecimal;
  taxAmount: MockDecimal;
  cgstAmount: MockDecimal;
  sgstAmount: MockDecimal;
  igstAmount: MockDecimal;
  total: MockDecimal;
  sortOrder: number;
};

export type MockInvoice = {
  id: string;
  userId: string;
  customerId: string;
  invoiceNumber: string;
  status: string;
  subtotal: MockDecimal;
  discountAmount: MockDecimal;
  taxAmount: MockDecimal;
  cgstAmount: MockDecimal;
  sgstAmount: MockDecimal;
  igstAmount: MockDecimal;
  totalAmount: MockDecimal;
  amountPaid: MockDecimal;
  currency: string;
  gstSchemeAtIssue: string;
  supplyType: string;
  issueDate: Date;
  dueDate: Date;
  notes: string | null;
  customerNotes: string | null;
  createdAt: Date;
};

type InvoiceWhere = {
  id?: string;
  userId?: string;
  status?: string | { not: string };
  dueDate?: { gte?: Date; lt?: Date };
  invoiceNumber?: { startsWith?: string; contains?: string; mode?: string };
  totalAmount?: { equals: MockDecimal };
  AND?: InvoiceWhere[];
  OR?: Array<Record<string, unknown>>;
};

export type MockDecimal = {
  toString(): string;
  equals(other: { toString(): string }): boolean;
};

export function d(value: number | string): MockDecimal {
  const normalized = typeof value === "number" ? value.toFixed(2) : value;
  return {
    toString: () => normalized,
    equals: (other) => Number(other.toString()) === Number(normalized),
  };
}

function pick<T extends Record<string, unknown>>(
  row: T,
  select?: Record<string, boolean>,
): T | Partial<T> {
  if (!select) return row;
  return Object.fromEntries(
    Object.keys(select).map((key) => [key, row[key]]),
  ) as Partial<T>;
}

function matchesCustomerOr(
  customer: MockCustomer,
  or: Array<Record<string, unknown>>,
) {
  return or.some((clause) => {
    if ("email" in clause && clause.email) {
      const spec = clause.email as { equals?: string; mode?: string };
      const hay = customer.email ?? "";
      return spec.mode === "insensitive"
        ? hay.toLowerCase() === (spec.equals ?? "").toLowerCase()
        : hay === spec.equals;
    }
    if ("phone" in clause && clause.phone) {
      return customer.phone === (clause.phone as { equals: string }).equals;
    }
    return false;
  });
}

function invoiceMatchesSearch(
  invoice: MockInvoice,
  customers: Map<string, MockCustomer>,
  or: Array<Record<string, unknown>>,
) {
  return or.some((clause) => {
    if ("invoiceNumber" in clause && clause.invoiceNumber) {
      const { contains, mode } = clause.invoiceNumber as {
        contains: string;
        mode?: string;
      };
      const hay = invoice.invoiceNumber;
      return mode === "insensitive"
        ? hay.toLowerCase().includes(contains.toLowerCase())
        : hay.includes(contains);
    }
    if ("customer" in clause && clause.customer) {
      const customer = customers.get(invoice.customerId);
      if (!customer) return false;
      const { contains, mode } = (clause.customer as { name: { contains: string; mode?: string } })
        .name;
      const hay = customer.name;
      return mode === "insensitive"
        ? hay.toLowerCase().includes(contains.toLowerCase())
        : hay.includes(contains);
    }
    if ("totalAmount" in clause && clause.totalAmount) {
      const equals = (clause.totalAmount as { equals: MockDecimal }).equals;
      return invoice.totalAmount.equals(equals);
    }
    return false;
  });
}

function matchesInvoiceWhere(
  invoice: MockInvoice,
  customers: Map<string, MockCustomer>,
  where: InvoiceWhere,
): boolean {
  if (where.userId && invoice.userId !== where.userId) return false;
  if (where.id && invoice.id !== where.id) return false;
  if (where.status) {
    if (typeof where.status === "string") {
      if (invoice.status !== where.status) return false;
    } else if (where.status.not && invoice.status === where.status.not) {
      return false;
    }
  }
  if (where.dueDate?.gte && invoice.dueDate < where.dueDate.gte) return false;
  if (where.dueDate?.lt && invoice.dueDate >= where.dueDate.lt) return false;
  if (where.invoiceNumber?.startsWith) {
    if (!invoice.invoiceNumber.startsWith(where.invoiceNumber.startsWith)) {
      return false;
    }
  }
  if (where.OR && !invoiceMatchesSearch(invoice, customers, where.OR)) {
    return false;
  }
  if (where.AND) {
    return where.AND.every((part) =>
      matchesInvoiceWhere(invoice, customers, part),
    );
  }
  return true;
}

export function createDefaultUser(overrides?: Partial<MockUser>): MockUser {
  return {
    id: USER_ID,
    gstScheme: "regular",
    stateCode: "27",
    gstNumber: null,
    invoicePrefix: "INV",
    ...overrides,
  };
}

export function createDefaultCustomer(
  overrides?: Partial<MockCustomer>,
): MockCustomer {
  return {
    id: CUSTOMER_ID,
    userId: USER_ID,
    name: "Acme Traders",
    email: "acme@example.com",
    phone: null,
    address: null,
    gstNumber: "27AABCU9603R1ZM",
    stateCode: "27",
    ...overrides,
  };
}

export function createMockInvoice(
  overrides: Partial<MockInvoice> & {
    id: string;
    customerId?: string;
    invoiceNumber: string;
  },
): MockInvoice {
  const total = overrides.totalAmount ?? d(118);
  return {
    userId: USER_ID,
    customerId: CUSTOMER_ID,
    status: "draft",
    subtotal: d(100),
    discountAmount: d(0),
    taxAmount: d(18),
    cgstAmount: d(9),
    sgstAmount: d(9),
    igstAmount: d(0),
    totalAmount: total,
    amountPaid: d(0),
    currency: "INR",
    gstSchemeAtIssue: "regular",
    supplyType: "intra",
    issueDate: new Date("2026-08-29T12:00:00.000Z"),
    dueDate: new Date("2026-09-28T12:00:00.000Z"),
    notes: null,
    customerNotes: null,
    createdAt: new Date("2026-08-29T10:00:00.000Z"),
    ...overrides,
  };
}

export function validCreateBody(customerId: string = CUSTOMER_ID) {
  return {
    customerId,
    issueDate: "2026-08-29",
    dueDate: "2026-09-28",
    lines: [
      { productName: "Widget", quantity: 1, unitPrice: 100, taxRate: 18 as const },
    ],
    discountMode: "flat" as const,
    discountValue: 0,
  };
}

export function createMockInvoicePrisma() {
  const users = new Map<string, MockUser>();
  const customers = new Map<string, MockCustomer>();
  const invoices = new Map<string, MockInvoice>();
  const items = new Map<string, MockInvoiceItem>();
  let nextInvoiceId = 1;
  let nextItemId = 1;
  let nextCustomerId = 100;

  function createTxClient() {
    return {
      customer: {
        findFirst: customer.findFirst,
        create: customer.create,
      },
      invoice: {
        findFirst: invoice.findFirst,
        create: invoice.create,
        update: invoice.update,
      },
      invoiceItem: {
        deleteMany: invoiceItem.deleteMany,
      },
      user: {
        findUnique: user.findUnique,
      },
    };
  }

  const user = {
    findUnique: vi.fn(
      async ({
        where,
        select,
      }: {
        where: { id: string };
        select?: Record<string, boolean>;
      }) => {
        const row = users.get(where.id);
        if (!row) return null;
        return pick(row, select);
      },
    ),
  };

  const customer = {
    findFirst: vi.fn(
      async ({
        where,
        select,
      }: {
        where: {
          id?: string;
          userId?: string;
          OR?: Array<Record<string, unknown>>;
        };
        select?: Record<string, boolean>;
      }) => {
        for (const row of customers.values()) {
          if (where.id && row.id !== where.id) continue;
          if (where.userId && row.userId !== where.userId) continue;
          if (where.OR && !matchesCustomerOr(row, where.OR)) continue;
          return pick(row, select);
        }
        return null;
      },
    ),
    create: vi.fn(
      async ({
        data,
        select,
      }: {
        data: Omit<MockCustomer, "id"> & { id?: string };
        select?: Record<string, boolean>;
      }) => {
        const id = data.id ?? `customer-${nextCustomerId++}`;
        const row: MockCustomer = { id, ...data };
        customers.set(id, row);
        return pick(row, select);
      },
    ),
  };

  const invoice = {
    count: vi.fn(async ({ where }: { where: InvoiceWhere }) => {
      return [...invoices.values()].filter((row) =>
        matchesInvoiceWhere(row, customers, where),
      ).length;
    }),
    findMany: vi.fn(
      async ({
        where,
        select,
        orderBy,
        skip,
        take,
      }: {
        where: InvoiceWhere;
        select?: Record<string, unknown>;
        orderBy?: { createdAt: "asc" | "desc" };
        skip?: number;
        take?: number;
      }) => {
        let rows = [...invoices.values()].filter((row) =>
          matchesInvoiceWhere(row, customers, where),
        );
        if (orderBy?.createdAt === "desc") {
          rows = rows.sort(
            (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
          );
        }
        const sliced = rows.slice(skip ?? 0, (skip ?? 0) + (take ?? 20));
        return sliced.map((row) => {
          const base = pick(row, select as Record<string, boolean>);
          if (
            select &&
            typeof select.customer === "object" &&
            select.customer !== null
          ) {
            const cust = customers.get(row.customerId);
            const custSelect = (select.customer as { select: Record<string, boolean> })
              .select;
            return {
              ...base,
              customer: cust ? pick(cust, custSelect) : null,
            };
          }
          return base;
        });
      },
    ),
    findFirst: vi.fn(
      async ({
        where,
        select,
        include,
        orderBy,
      }: {
        where: InvoiceWhere;
        select?: Record<string, boolean>;
        include?: Record<string, unknown>;
        orderBy?: { invoiceNumber: "asc" | "desc" };
      }) => {
        let rows = [...invoices.values()].filter((row) =>
          matchesInvoiceWhere(row, customers, where),
        );
        if (orderBy?.invoiceNumber === "desc") {
          rows = rows.sort((a, b) =>
            b.invoiceNumber.localeCompare(a.invoiceNumber),
          );
        }
        const row = rows[0];
        if (!row) return null;

        if (include) {
          const result: Record<string, unknown> = { ...row };
          if (include.customer) {
            const cust = customers.get(row.customerId);
            const custSelect = (include.customer as { select: Record<string, boolean> })
              .select;
            result.customer = cust ? pick(cust, custSelect) : null;
          }
          if (include.items) {
            const invoiceItems = [...items.values()]
              .filter((it) => it.invoiceId === row.id)
              .sort((a, b) => a.sortOrder - b.sortOrder);
            result.items = invoiceItems;
          }
          return result;
        }

        return pick(row, select);
      },
    ),
    create: vi.fn(
      async ({
        data,
        select,
      }: {
        data: Record<string, unknown>;
        select?: Record<string, boolean>;
      }) => {
        const id = `invoice-${nextInvoiceId++}`;
        const {
          items: nestedItems,
          ...invoiceData
        } = data as {
          items?: { create: Array<Record<string, unknown>> };
        } & Omit<MockInvoice, "id">;

        const row = { id, ...invoiceData } as MockInvoice;
        invoices.set(id, row);

        if (nestedItems?.create) {
          for (const item of nestedItems.create) {
            const itemId = `item-${nextItemId++}`;
            items.set(itemId, {
              id: itemId,
              invoiceId: id,
              ...(item as Omit<MockInvoiceItem, "id" | "invoiceId">),
            });
          }
        }

        const created = pick(row, select);
        if (select?.totalAmount && row.totalAmount) {
          return { ...created, totalAmount: row.totalAmount };
        }
        return created;
      },
    ),
    update: vi.fn(
      async ({
        where,
        data,
        select,
      }: {
        where: { id: string };
        data: Record<string, unknown>;
        select?: Record<string, boolean>;
      }) => {
        const existing = invoices.get(where.id);
        if (!existing) throw new Error("Invoice not found");
        const { items: nestedItems, ...rest } = data as {
          items?: { create: Array<Record<string, unknown>> };
        };
        const updated = { ...existing, ...rest } as MockInvoice;
        invoices.set(where.id, updated);

        if (nestedItems?.create) {
          for (const [key, item] of items.entries()) {
            if (item.invoiceId === where.id) items.delete(key);
          }
          for (const item of nestedItems.create) {
            const itemId = `item-${nextItemId++}`;
            items.set(itemId, {
              id: itemId,
              invoiceId: where.id,
              ...(item as Omit<MockInvoiceItem, "id" | "invoiceId">),
            });
          }
        }

        return pick(updated, select);
      },
    ),
    delete: vi.fn(async ({ where }: { where: { id: string } }) => {
      invoices.delete(where.id);
      for (const [key, item] of items.entries()) {
        if (item.invoiceId === where.id) items.delete(key);
      }
      return { id: where.id };
    }),
  };

  const invoiceItem = {
    deleteMany: vi.fn(async ({ where }: { where: { invoiceId: string } }) => {
      for (const [key, item] of items.entries()) {
        if (item.invoiceId === where.invoiceId) items.delete(key);
      }
      return { count: 1 };
    }),
  };

  const $transaction = vi.fn(
    async (fn: (tx: ReturnType<typeof createTxClient>) => Promise<unknown>) => {
      return fn(createTxClient());
    },
  );

  return {
    user,
    customer,
    invoice,
    invoiceItem,
    $transaction,
    seedUser(row: MockUser) {
      users.set(row.id, row);
    },
    seedCustomer(row: MockCustomer) {
      customers.set(row.id, row);
    },
    seedInvoice(row: MockInvoice, invoiceItems?: Omit<MockInvoiceItem, "id" | "invoiceId">[]) {
      invoices.set(row.id, row);
      invoiceItems?.forEach((item, index) => {
        const itemId = `item-${nextItemId++}`;
        items.set(itemId, {
          id: itemId,
          invoiceId: row.id,
          sortOrder: index,
          ...item,
        } as MockInvoiceItem);
      });
    },
    reset() {
      users.clear();
      customers.clear();
      invoices.clear();
      items.clear();
      nextInvoiceId = 1;
      nextItemId = 1;
      nextCustomerId = 100;
      vi.clearAllMocks();
    },
    _invoices: invoices,
    _items: items,
  };
}
