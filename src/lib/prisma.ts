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
  // On Vercel, prefer Supabase *pooler* (port 6543) — direct db.* hosts are often IPv6-only.
  const connectionString = stripSslMode(raw);
  const useRelaxedSsl = isSupabasePostgres(connectionString);

  const pool = new Pool({
    connectionString,
    // Vercel serverless: one connection per isolate
    max: 1,
    connectionTimeoutMillis: 10_000,
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
 * Use a singleton in all environments so navigations do not open a new
 * Postgres pool per module reload. After `prisma generate`, restart the
 * dev server once if models look missing.
 */
export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
