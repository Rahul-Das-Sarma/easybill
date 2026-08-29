-- AlterTable
ALTER TABLE "users" ADD COLUMN "onboarding_completed" BOOLEAN NOT NULL DEFAULT false;

-- Existing users who already chose business type skip the wizard
UPDATE "users" SET "onboarding_completed" = true WHERE "business_type_chosen" = true;
