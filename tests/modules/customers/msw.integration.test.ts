import { beforeEach, describe, expect, it } from "vitest";

import {
  CUSTOMERS_API_BASE,
  resetCustomersStore,
  seedCustomer,
} from "../../mocks/handlers/customers";
import { createDefaultCustomer } from "../../mocks/customer-store";

const USER_ID = "msw-customers-user-1";
const AUTH = { Authorization: `Bearer ${USER_ID}` };

describe("Customers API — MSW mock server integration", () => {
  beforeEach(() => {
    resetCustomersStore();
  });

  it("POST /api/customers creates a customer", async () => {
    const res = await fetch(`${CUSTOMERS_API_BASE}/api/customers`, {
      method: "POST",
      headers: { ...AUTH, "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "MSW Customer",
        email: "msw@example.com",
        gstNumber: "27AABCU9603R1ZM",
      }),
    });

    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      customer: { name: string; stateCode: string | null };
    };
    expect(json.customer.name).toBe("MSW Customer");
    expect(json.customer.stateCode).toBe("27");
  });

  it("POST /api/customers returns 409 for duplicate email", async () => {
    seedCustomer(
      createDefaultCustomer({
        id: "seed-1",
        userId: USER_ID,
        name: "Existing",
        email: "dup@example.com",
      }),
    );

    const res = await fetch(`${CUSTOMERS_API_BASE}/api/customers`, {
      method: "POST",
      headers: { ...AUTH, "Content-Type": "application/json" },
      body: JSON.stringify({ name: "New", email: "dup@example.com" }),
    });

    expect(res.status).toBe(409);
  });

  it("GET /api/customers/search filters results", async () => {
    seedCustomer(
      createDefaultCustomer({
        id: "seed-2",
        userId: USER_ID,
        name: "Alpha",
      }),
    );
    seedCustomer(
      createDefaultCustomer({
        id: "seed-3",
        userId: USER_ID,
        name: "Beta Searchable",
      }),
    );

    const res = await fetch(
      `${CUSTOMERS_API_BASE}/api/customers/search?q=searchable`,
      { headers: AUTH },
    );

    const json = (await res.json()) as { customers: { name: string }[] };
    expect(res.status).toBe(200);
    expect(json.customers).toHaveLength(1);
    expect(json.customers[0]?.name).toBe("Beta Searchable");
  });

  it("GET /api/customers/:id returns customer", async () => {
    seedCustomer(
      createDefaultCustomer({
        id: "cust-detail-1",
        userId: USER_ID,
        name: "Detail Co",
        address: "Chennai",
      }),
    );

    const res = await fetch(`${CUSTOMERS_API_BASE}/api/customers/cust-detail-1`, {
      headers: AUTH,
    });

    const json = (await res.json()) as { customer: { name: string; address: string | null } };
    expect(res.status).toBe(200);
    expect(json.customer.name).toBe("Detail Co");
    expect(json.customer.address).toBe("Chennai");
  });

  it("PATCH /api/customers/:id updates customer", async () => {
    seedCustomer(
      createDefaultCustomer({
        id: "cust-patch-1",
        userId: USER_ID,
        name: "Before",
      }),
    );

    const res = await fetch(`${CUSTOMERS_API_BASE}/api/customers/cust-patch-1`, {
      method: "PATCH",
      headers: { ...AUTH, "Content-Type": "application/json" },
      body: JSON.stringify({ name: "After", stateCode: "33" }),
    });

    const json = (await res.json()) as {
      customer: { name: string; stateCode: string | null };
    };
    expect(res.status).toBe(200);
    expect(json.customer.name).toBe("After");
    expect(json.customer.stateCode).toBe("33");
  });

  it("returns 401 without auth header", async () => {
    const res = await fetch(`${CUSTOMERS_API_BASE}/api/customers/search`);
    expect(res.status).toBe(401);
  });

  it("returns 404 for unknown customer id", async () => {
    const res = await fetch(`${CUSTOMERS_API_BASE}/api/customers/missing`, {
      headers: AUTH,
    });
    expect(res.status).toBe(404);
  });
});
