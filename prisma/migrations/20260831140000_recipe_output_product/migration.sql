-- Recipe owns output product; sync name/price to inventory

ALTER TABLE "recipes" ADD COLUMN "output_product_id" UUID;
ALTER TABLE "recipes" ADD COLUMN "unit_price" DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE "recipes" ADD COLUMN "tax_rate" DECIMAL(5,2) NOT NULL DEFAULT 18;

CREATE UNIQUE INDEX "recipes_output_product_id_key" ON "recipes"("output_product_id");

ALTER TABLE "recipes" ADD CONSTRAINT "recipes_output_product_id_fkey" FOREIGN KEY ("output_product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Link existing recipes to their first assigned finished good as output product
UPDATE "recipes" r
SET "output_product_id" = sub."product_id",
    "unit_price" = sub."unit_price",
    "tax_rate" = sub."tax_rate"
FROM (
  SELECT DISTINCT ON (p."recipe_id")
    p."recipe_id",
    p."id" AS "product_id",
    p."unit_price",
    p."tax_rate"
  FROM "products" p
  WHERE p."recipe_id" IS NOT NULL
    AND p."kind" = 'finished_good'
  ORDER BY p."recipe_id", p."created_at" ASC
) sub
WHERE r."id" = sub."recipe_id"
  AND r."output_product_id" IS NULL;

-- Create inventory products for recipes that have no output product yet
INSERT INTO "products" (
  "id", "user_id", "name", "kind", "quantity", "unit_price", "tax_rate", "is_active", "recipe_id", "created_at", "updated_at"
)
SELECT
  gen_random_uuid(),
  r."user_id",
  r."name",
  'finished_good',
  0,
  r."unit_price",
  r."tax_rate",
  true,
  r."id",
  NOW(),
  NOW()
FROM "recipes" r
WHERE r."output_product_id" IS NULL;

UPDATE "recipes" r
SET "output_product_id" = p."id"
FROM "products" p
WHERE p."recipe_id" = r."id"
  AND p."kind" = 'finished_good'
  AND r."output_product_id" IS NULL;
