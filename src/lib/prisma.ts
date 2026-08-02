import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { Pool } from "pg";

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
};

/** Supabase (and most hosted Postgres) need TLS from Vercel. */
function withSslIfNeeded(connectionString: string): string {
  if (/[?&]sslmode=/i.test(connectionString)) return connectionString;
  if (!/\.supabase\.co|\.pooler\.supabase\.com/i.test(connectionString)) {
    return connectionString;
  }
  const join = connectionString.includes("?") ? "&" : "?";
  return `${connectionString}${join}sslmode=require`;
}

function createPrismaClient(): PrismaClient {
  const raw = process.env.DATABASE_URL;
  if (!raw) {
    throw new Error("DATABASE_URL is not set");
  }
  // Password special chars (@ # / %) must be URL-encoded or the host is parsed wrong.
  const connectionString = withSslIfNeeded(raw);
  const pool = new Pool({
    connectionString,
    // Vercel serverless: keep pools small
    max: 1,
    ssl: /sslmode=require/i.test(connectionString)
      ? { rejectUnauthorized: false }
      : undefined,
  });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

/**
 * In development, avoid caching on `globalThis`. After `prisma generate`, a stale
 * cached client would miss new models (e.g. `prisma.product` is undefined).
 * Production keeps a singleton to limit connection usage.
 */
export const prisma =
  process.env.NODE_ENV === "production"
    ? (globalForPrisma.prisma ??= createPrismaClient())
    : createPrismaClient();
