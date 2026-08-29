-- CreateEnum
CREATE TYPE "GstScheme" AS ENUM ('regular', 'composition', 'unregistered');

-- CreateEnum
CREATE TYPE "SupplyType" AS ENUM ('intra', 'inter', 'none');

-- AlterTable
ALTER TABLE "users" ADD COLUMN "gst_scheme" "GstScheme" NOT NULL DEFAULT 'regular';
ALTER TABLE "users" ADD COLUMN "state_code" TEXT;

-- AlterTable
ALTER TABLE "customers" ADD COLUMN "state_code" TEXT;

-- AlterTable
ALTER TABLE "invoices" ADD COLUMN "cgst_amount" DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE "invoices" ADD COLUMN "sgst_amount" DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE "invoices" ADD COLUMN "igst_amount" DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE "invoices" ADD COLUMN "gst_scheme_at_issue" "GstScheme" NOT NULL DEFAULT 'regular';
ALTER TABLE "invoices" ADD COLUMN "supply_type" "SupplyType" NOT NULL DEFAULT 'none';

-- AlterTable
ALTER TABLE "invoice_items" ADD COLUMN "cgst_amount" DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE "invoice_items" ADD COLUMN "sgst_amount" DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE "invoice_items" ADD COLUMN "igst_amount" DECIMAL(10,2) NOT NULL DEFAULT 0;
