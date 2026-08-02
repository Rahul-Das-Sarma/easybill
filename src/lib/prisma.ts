import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { Pool } from "pg";

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
};

function isSupabasePostgres(connectionString: string): boolean {
  return /\.supabase\.co|\.pooler\.supabase\.com/i.test(connectionString);
}

/** Drop sslmode from the URL so Pool `ssl` fully controls TLS (avoids cert-chain errors). */
function stripSslMode(connectionString: string): string {
  return connectionString
    .replace(/([?&])sslmode=[^&]*/gi, "$1")
    .replace(/\?&/, "?")
    .replace(/[?&]$/, "")
    .replace(/\?&/, "?");
}

function createPrismaClient(): PrismaClient {
  const raw = process.env.DATABASE_URL;
  if (!raw) {
    throw new Error("DATABASE_URL is not set");
  }

  // Password special chars (@ # / %) must be URL-encoded or the host is parsed wrong.
  const connectionString = stripSslMode(raw);
  const useRelaxedSsl = isSupabasePostgres(connectionString);

  const pool = new Pool({
    connectionString,
    // Vercel serverless: keep pools small
    max: process.env.NODE_ENV === "production" ? 1 : 10,
    ...(useRelaxedSsl
      ? {
          // Supabase uses a certificate chain Node rejects by default.
          ssl: { rejectUnauthorized: false },
        }
      : {}),
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
