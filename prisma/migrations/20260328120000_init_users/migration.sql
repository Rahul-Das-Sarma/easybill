-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('free', 'pro');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "company_name" TEXT NOT NULL,
    "company_logo_url" TEXT,
    "gst_number" TEXT,
    "address" TEXT NOT NULL,
    "phone" TEXT,
    "plan" "Plan" NOT NULL DEFAULT 'free',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- Row Level Security (Supabase: policies use auth.uid())
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "users" FORCE ROW LEVEL SECURITY;

CREATE POLICY "users_select_own"
ON "users"
FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "users_insert_own"
ON "users"
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

CREATE POLICY "users_update_own"
ON "users"
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "users_delete_own"
ON "users"
FOR DELETE
TO authenticated
USING (auth.uid() = id);
