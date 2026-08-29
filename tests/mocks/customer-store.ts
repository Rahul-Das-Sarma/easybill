import { vi } from "vitest";

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

type WhereClause = {
  id?: string;
  userId?: string;
  OR?: Array<Record<string, unknown>>;
};

function pick<T extends Record<string, unknown>>(
  row: T,
  select?: Record<string, boolean>,
): T | Partial<T> {
  if (!select) return row;
  return Object.fromEntries(
    Object.keys(select).map((key) => [key, row[key]]),
  ) as Partial<T>;
}

function matchesSearchOr(customer: MockCustomer, or: Array<Record<string, unknown>>) {
  return or.some((clause) => {
    if ("name" in clause && clause.name) {
      const { contains, mode } = clause.name as {
        contains: string;
        mode?: string;
      };
      const hay = customer.name;
      return mode === "insensitive"
        ? hay.toLowerCase().includes(contains.toLowerCase())
        : hay.includes(contains);
    }
    if ("email" in clause && clause.email) {
      const spec = clause.email as { contains?: string; equals?: string; mode?: string };
      if (spec.contains) {
        const hay = customer.email ?? "";
        return spec.mode === "insensitive"
          ? hay.toLowerCase().includes(spec.contains.toLowerCase())
          : hay.includes(spec.contains);
      }
      if (spec.equals) {
        const hay = customer.email ?? "";
        return spec.mode === "insensitive"
          ? hay.toLowerCase() === spec.equals.toLowerCase()
          : hay === spec.equals;
      }
    }
    if ("phone" in clause && clause.phone) {
      const spec = clause.phone as { contains?: string; equals?: string };
      if (spec.contains) {
        return (customer.phone ?? "").includes(spec.contains);
      }
      if (spec.equals) {
        return customer.phone === spec.equals;
      }
    }
    if ("gstNumber" in clause && clause.gstNumber) {
      const { contains, mode } = clause.gstNumber as {
        contains: string;
        mode?: string;
      };
      const hay = customer.gstNumber ?? "";
      return mode === "insensitive"
        ? hay.toLowerCase().includes(contains.toLowerCase())
        : hay.includes(contains);
    }
    return false;
  });
}

function matchesWhere(customer: MockCustomer, where: WhereClause) {
  if (where.userId && customer.userId !== where.userId) return false;
  if (where.id && customer.id !== where.id) return false;
  if (where.OR && !matchesSearchOr(customer, where.OR)) return false;
  return true;
}

export function createDefaultCustomer(
  overrides: Partial<MockCustomer> & { id: string; userId: string; name: string },
): MockCustomer {
  return {
    email: null,
    phone: null,
    address: null,
    gstNumber: null,
    stateCode: null,
    ...overrides,
  };
}

export function createMockCustomerPrisma() {
  const customers = new Map<string, MockCustomer>();
  let nextId = 1;

  const customer = {
    findFirst: vi.fn(
      async ({
        where,
        select,
      }: {
        where: WhereClause;
        select?: Record<string, boolean>;
      }) => {
        for (const row of customers.values()) {
          if (matchesWhere(row, where)) {
            return pick(row, select);
          }
        }
        return null;
      },
    ),
    findMany: vi.fn(
      async ({
        where,
        select,
        take,
        orderBy,
      }: {
        where: WhereClause;
        select?: Record<string, boolean>;
        take?: number;
        orderBy?: { name: "asc" | "desc" };
      }) => {
        let rows = [...customers.values()].filter((row) =>
          matchesWhere(row, { userId: where.userId, OR: where.OR }),
        );
        if (orderBy?.name === "asc") {
          rows = rows.sort((a, b) => a.name.localeCompare(b.name));
        }
        return rows
          .slice(0, take ?? 20)
          .map((row) => pick(row, select)) as Partial<MockCustomer>[];
      },
    ),
    create: vi.fn(
      async ({
        data,
        select,
      }: {
        data: Omit<MockCustomer, "id">;
        select?: Record<string, boolean>;
      }) => {
        const id = `customer-${nextId++}`;
        const row: MockCustomer = { id, ...data };
        customers.set(id, row);
        return pick(row, select);
      },
    ),
    update: vi.fn(
      async ({
        where,
        data,
        select,
      }: {
        where: { id: string };
        data: Partial<MockCustomer>;
        select?: Record<string, boolean>;
      }) => {
        const existing = customers.get(where.id);
        if (!existing) {
          throw new Error("Customer not found");
        }
        const updated = { ...existing, ...data };
        customers.set(where.id, updated);
        return pick(updated, select);
      },
    ),
  };

  return {
    customer,
    seed(row: MockCustomer) {
      customers.set(row.id, row);
    },
    reset() {
      customers.clear();
      nextId = 1;
      customer.findFirst.mockClear();
      customer.findMany.mockClear();
      customer.create.mockClear();
      customer.update.mockClear();
    },
    _customers: customers,
  };
}
