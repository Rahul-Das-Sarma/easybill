-- Link existing app users to Clerk without changing UUID primary keys.
ALTER TABLE "users" ADD COLUMN "clerk_user_id" TEXT;

CREATE UNIQUE INDEX "users_clerk_user_id_key" ON "users"("clerk_user_id");
