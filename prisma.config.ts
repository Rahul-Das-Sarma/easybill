import { config } from "dotenv";
import { defineConfig, env } from "prisma/config";

config({ path: ".env" });
config({ path: ".env.local", override: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Migrations need a direct (session) connection — not transaction pooler :6543.
    url: process.env.DIRECT_URL ?? env("DATABASE_URL"),
  },
});
