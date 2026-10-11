ALTER TABLE "users" ADD COLUMN "city" TEXT;
ALTER TABLE "users" ADD COLUMN "pincode" TEXT;
ALTER TABLE "users" ADD COLUMN "einvoice_username" TEXT;
ALTER TABLE "users" ADD COLUMN "einvoice_password_enc" TEXT;
ALTER TABLE "users" ADD COLUMN "einvoice_client_id" TEXT;
ALTER TABLE "users" ADD COLUMN "einvoice_secret_enc" TEXT;
ALTER TABLE "users" ADD COLUMN "einvoice_public_key" TEXT;
ALTER TABLE "users" ADD COLUMN "einvoice_env" TEXT NOT NULL DEFAULT 'sandbox';

ALTER TABLE "products" ADD COLUMN "hsn_code" TEXT;
ALTER TABLE "customers" ADD COLUMN "pincode" TEXT;
ALTER TABLE "invoice_items" ADD COLUMN "hsn_code" TEXT;

ALTER TABLE "invoices" ADD COLUMN "irn" TEXT;
ALTER TABLE "invoices" ADD COLUMN "irn_ack_no" TEXT;
ALTER TABLE "invoices" ADD COLUMN "irn_ack_date" TIMESTAMPTZ(6);
ALTER TABLE "invoices" ADD COLUMN "irn_signed_qr" TEXT;
ALTER TABLE "invoices" ADD COLUMN "eway_bill_no" TEXT;
ALTER TABLE "invoices" ADD COLUMN "eway_bill_date" TIMESTAMPTZ(6);
ALTER TABLE "invoices" ADD COLUMN "eway_valid_till" TIMESTAMPTZ(6);
