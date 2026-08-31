-- Reusable recipe formulas for manufacturer production

CREATE TABLE "recipes" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "recipes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "recipes_user_id_idx" ON "recipes"("user_id");

ALTER TABLE "recipes" ADD CONSTRAINT "recipes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "recipe_components" (
    "id" UUID NOT NULL,
    "recipe_id" UUID NOT NULL,
    "raw_material_id" UUID NOT NULL,
    "quantity_per_unit" DECIMAL(12,4) NOT NULL,

    CONSTRAINT "recipe_components_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "recipe_components_recipe_id_raw_material_id_key" ON "recipe_components"("recipe_id", "raw_material_id");
CREATE INDEX "recipe_components_recipe_id_idx" ON "recipe_components"("recipe_id");

ALTER TABLE "recipe_components" ADD CONSTRAINT "recipe_components_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "recipe_components" ADD CONSTRAINT "recipe_components_raw_material_id_fkey" FOREIGN KEY ("raw_material_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "products" ADD COLUMN "recipe_id" UUID;
CREATE INDEX "products_recipe_id_idx" ON "products"("recipe_id");
ALTER TABLE "products" ADD CONSTRAINT "products_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "recipes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "production_runs" ADD COLUMN "recipe_id" UUID;
ALTER TABLE "production_runs" ADD CONSTRAINT "production_runs_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "recipes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Migrate existing per-product BOMs into reusable recipes (one recipe per finished good)
INSERT INTO "recipes" ("id", "user_id", "name", "description", "created_at", "updated_at")
SELECT
    gen_random_uuid(),
    fg."user_id",
    fg."name" || ' formula',
    'Migrated from product bill of materials',
    NOW(),
    NOW()
FROM (
    SELECT DISTINCT bc."finished_good_id"
    FROM "bom_components" bc
) bom_fg
JOIN "products" fg ON fg."id" = bom_fg."finished_good_id";

INSERT INTO "recipe_components" ("id", "recipe_id", "raw_material_id", "quantity_per_unit")
SELECT
    gen_random_uuid(),
    r."id",
    bc."raw_material_id",
    bc."quantity_per_unit"
FROM "bom_components" bc
JOIN "products" fg ON fg."id" = bc."finished_good_id"
JOIN "recipes" r ON r."user_id" = fg."user_id" AND r."name" = fg."name" || ' formula';

UPDATE "products" p
SET "recipe_id" = r."id"
FROM "recipes" r
WHERE r."user_id" = p."user_id"
  AND r."name" = p."name" || ' formula'
  AND p."kind" = 'finished_good'
  AND EXISTS (
    SELECT 1 FROM "bom_components" bc WHERE bc."finished_good_id" = p."id"
  );
