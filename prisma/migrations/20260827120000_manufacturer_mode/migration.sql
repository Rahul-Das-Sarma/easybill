-- CreateEnum
CREATE TYPE "BusinessType" AS ENUM ('trading', 'manufacturer');
CREATE TYPE "ProductKind" AS ENUM ('finished_good', 'raw_material');

-- AlterTable users
ALTER TABLE "users" ADD COLUMN "business_type" "BusinessType" NOT NULL DEFAULT 'trading';
ALTER TABLE "users" ADD COLUMN "business_type_chosen" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable products
ALTER TABLE "products" ADD COLUMN "kind" "ProductKind" NOT NULL DEFAULT 'finished_good';
CREATE INDEX "products_user_id_kind_idx" ON "products"("user_id", "kind");

-- CreateTable bom_components
CREATE TABLE "bom_components" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "finished_good_id" UUID NOT NULL,
    "raw_material_id" UUID NOT NULL,
    "quantity_per_unit" DECIMAL(12,4) NOT NULL,

    CONSTRAINT "bom_components_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "bom_components_finished_good_id_raw_material_id_key" ON "bom_components"("finished_good_id", "raw_material_id");
CREATE INDEX "bom_components_user_id_idx" ON "bom_components"("user_id");
CREATE INDEX "bom_components_finished_good_id_idx" ON "bom_components"("finished_good_id");

ALTER TABLE "bom_components" ADD CONSTRAINT "bom_components_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "bom_components" ADD CONSTRAINT "bom_components_finished_good_id_fkey" FOREIGN KEY ("finished_good_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "bom_components" ADD CONSTRAINT "bom_components_raw_material_id_fkey" FOREIGN KEY ("raw_material_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable production_runs
CREATE TABLE "production_runs" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "finished_good_id" UUID NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "production_runs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "production_runs_user_id_created_at_idx" ON "production_runs"("user_id", "created_at");

ALTER TABLE "production_runs" ADD CONSTRAINT "production_runs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "production_runs" ADD CONSTRAINT "production_runs_finished_good_id_fkey" FOREIGN KEY ("finished_good_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
