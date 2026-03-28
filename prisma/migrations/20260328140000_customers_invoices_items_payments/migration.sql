-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('draft', 'pending', 'partial', 'paid', 'overdue');

CREATE TYPE "PaymentMethod" AS ENUM ('cash', 'upi', 'bank_transfer', 'card', 'cheque', 'other');

-- CreateTable
CREATE TABLE "customers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "gst_number" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "invoice_number" TEXT NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'draft',
    "subtotal" DECIMAL(10,2) NOT NULL,
    "discount_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "tax_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(10,2) NOT NULL,
    "amount_paid" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "issue_date" DATE NOT NULL,
    "due_date" DATE NOT NULL,
    "notes" TEXT,
    "customer_notes" TEXT,
    "pdf_url" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "invoice_id" UUID NOT NULL,
    "product_name" TEXT NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "unit_price" DECIMAL(10,2) NOT NULL,
    "tax_rate" DECIMAL(5,2) NOT NULL,
    "tax_amount" DECIMAL(10,2) NOT NULL,
    "total" DECIMAL(10,2) NOT NULL,
    "sort_order" INTEGER NOT NULL,

    CONSTRAINT "invoice_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "invoice_id" UUID NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "payment_date" DATE NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "reference" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "invoices" ADD CONSTRAINT "invoices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "invoices" ADD CONSTRAINT "invoices_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "payments" ADD CONSTRAINT "payments_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "customers_user_id_idx" ON "customers"("user_id");

CREATE INDEX "invoices_user_id_idx" ON "invoices"("user_id");

CREATE INDEX "invoices_customer_id_idx" ON "invoices"("customer_id");

CREATE UNIQUE INDEX "invoices_user_id_invoice_number_key" ON "invoices"("user_id", "invoice_number");

CREATE INDEX "invoice_items_invoice_id_idx" ON "invoice_items"("invoice_id");

CREATE INDEX "payments_invoice_id_idx" ON "payments"("invoice_id");

-- Row Level Security (one FOR ALL policy per table; child tables scope via parent invoice)
ALTER TABLE "customers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "customers" FORCE ROW LEVEL SECURITY;

CREATE POLICY "Users can only see their own data"
ON "customers"
FOR ALL
TO authenticated
USING ("user_id" = auth.uid())
WITH CHECK ("user_id" = auth.uid());

ALTER TABLE "invoices" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "invoices" FORCE ROW LEVEL SECURITY;

CREATE POLICY "Users can only see their own data"
ON "invoices"
FOR ALL
TO authenticated
USING ("user_id" = auth.uid())
WITH CHECK ("user_id" = auth.uid());

ALTER TABLE "invoice_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "invoice_items" FORCE ROW LEVEL SECURITY;

CREATE POLICY "Users can only see their own data"
ON "invoice_items"
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM "invoices" i
    WHERE i.id = "invoice_items"."invoice_id"
      AND i.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM "invoices" i
    WHERE i.id = "invoice_items"."invoice_id"
      AND i.user_id = auth.uid()
  )
);

ALTER TABLE "payments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "payments" FORCE ROW LEVEL SECURITY;

CREATE POLICY "Users can only see their own data"
ON "payments"
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM "invoices" i
    WHERE i.id = "payments"."invoice_id"
      AND i.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM "invoices" i
    WHERE i.id = "payments"."invoice_id"
      AND i.user_id = auth.uid()
  )
);
