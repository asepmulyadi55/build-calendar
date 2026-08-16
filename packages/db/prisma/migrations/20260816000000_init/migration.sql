-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('user', 'admin');

-- CreateEnum
CREATE TYPE "holiday_type" AS ENUM ('national', 'joint_leave', 'religious', 'international');

-- CreateTable
CREATE TABLE "profiles" (
    "id" UUID NOT NULL,
    "name" TEXT,
    "phone" TEXT,
    "role" "user_role" NOT NULL DEFAULT 'user',
    "coin_balance_cache" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coin_packages" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "price_idr" INTEGER NOT NULL,
    "coin_amount" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "badge" TEXT,

    CONSTRAINT "coin_packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_presets" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "width_mm" INTEGER NOT NULL,
    "height_mm" INTEGER NOT NULL,
    "orientation" TEXT NOT NULL,
    "sheet_count" INTEGER NOT NULL,
    "months_per_sheet" INTEGER NOT NULL,
    "has_cover" BOOLEAN NOT NULL DEFAULT false,
    "bleed_mm" INTEGER NOT NULL,
    "safe_margin_mm" INTEGER NOT NULL,
    "unlock_cost_coins" INTEGER NOT NULL,
    "weight_gram_per_sheet" INTEGER NOT NULL DEFAULT 0,
    "print_base_price" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "product_presets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "templates" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "product_preset_id" UUID NOT NULL,
    "category" TEXT NOT NULL,
    "thumbnail_key" TEXT,
    "design_key" TEXT NOT NULL,
    "slot_schema" JSONB NOT NULL,
    "is_premium" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "holidays" (
    "id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "name" TEXT NOT NULL,
    "type" "holiday_type" NOT NULL,
    "year" INTEGER NOT NULL,
    "is_red_date" BOOLEAN NOT NULL DEFAULT true,
    "source" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "holidays_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "key" TEXT NOT NULL,
    "value_json" JSONB NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "product_presets_code_key" ON "product_presets"("code");

-- CreateIndex
CREATE UNIQUE INDEX "templates_slug_key" ON "templates"("slug");

-- CreateIndex
CREATE INDEX "templates_product_preset_id_idx" ON "templates"("product_preset_id");

-- CreateIndex
CREATE INDEX "holidays_year_idx" ON "holidays"("year");

-- CreateIndex
CREATE UNIQUE INDEX "holidays_date_name_key" ON "holidays"("date", "name");

-- AddForeignKey
ALTER TABLE "templates" ADD CONSTRAINT "templates_product_preset_id_fkey" FOREIGN KEY ("product_preset_id") REFERENCES "product_presets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- ============================================================================
-- Supabase Auth bridge (01-tech-stack-and-infrastructure.md §5.4)
--
-- `auth.users` is owned by Supabase and is not modelled in schema.prisma. A
-- foreign key from public.profiles to auth.users would read as schema drift on
-- every `prisma migrate dev`, because the auth schema is outside the datasource.
-- These triggers give the same guarantee — a profile exists for exactly as long
-- as its auth user does — without Prisma fighting over ownership.
--
-- The trigger block is guarded because `prisma migrate dev` replays every
-- migration against a throwaway shadow database, which has no `auth` schema.
-- Unguarded, this migration fails with P3006 and `pnpm db:migrate` never runs.
-- ============================================================================

CREATE OR REPLACE FUNCTION "public"."handle_new_user"()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO "public"."profiles" ("id", "name")
  VALUES (NEW."id", NEW."raw_user_meta_data" ->> 'name')
  ON CONFLICT ("id") DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION "public"."handle_deleted_user"()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM "public"."profiles" WHERE "id" = OLD."id";
  RETURN OLD;
END;
$$;

DO $bridge$
BEGIN
  IF to_regclass('auth.users') IS NULL THEN
    RAISE NOTICE 'auth.users not present (shadow database?) — skipping Supabase auth bridge triggers';
    RETURN;
  END IF;

  DROP TRIGGER IF EXISTS "on_auth_user_created" ON "auth"."users";
  CREATE TRIGGER "on_auth_user_created"
    AFTER INSERT ON "auth"."users"
    FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_user"();

  DROP TRIGGER IF EXISTS "on_auth_user_deleted" ON "auth"."users";
  CREATE TRIGGER "on_auth_user_deleted"
    AFTER DELETE ON "auth"."users"
    FOR EACH ROW EXECUTE FUNCTION "public"."handle_deleted_user"();
END
$bridge$;

-- ============================================================================
-- Row Level Security (01-tech-stack-and-infrastructure.md §5.3)
--
-- Supabase publishes every table in `public` through PostgREST, reachable with
-- the anon key that ships in the browser bundle. A table without RLS is a
-- world-readable table.
--
-- All application access goes through our own server using the service-role key,
-- which bypasses RLS — so RLS is the safety net, not the primary boundary, and
-- deny-all is the correct policy. Any table that later needs direct client access
-- gets its own explicit policy in the migration that introduces that access.
--
-- `pnpm check:rls` fails the build if a table is created without this block.
-- ============================================================================

ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_all" ON "public"."profiles" AS RESTRICTIVE
  FOR ALL TO public USING (false) WITH CHECK (false);

ALTER TABLE "public"."coin_packages" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_all" ON "public"."coin_packages" AS RESTRICTIVE
  FOR ALL TO public USING (false) WITH CHECK (false);

ALTER TABLE "public"."product_presets" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_all" ON "public"."product_presets" AS RESTRICTIVE
  FOR ALL TO public USING (false) WITH CHECK (false);

ALTER TABLE "public"."templates" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_all" ON "public"."templates" AS RESTRICTIVE
  FOR ALL TO public USING (false) WITH CHECK (false);

ALTER TABLE "public"."holidays" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_all" ON "public"."holidays" AS RESTRICTIVE
  FOR ALL TO public USING (false) WITH CHECK (false);

ALTER TABLE "public"."settings" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_all" ON "public"."settings" AS RESTRICTIVE
  FOR ALL TO public USING (false) WITH CHECK (false);

-- PostgREST reaches these tables as the `anon` and `authenticated` roles.
-- RLS above already denies everything; removing the grants as well means a future
-- policy added by mistake still cannot expose a table. Guarded because the roles
-- are Supabase's and are absent from a plain Postgres.
DO $grants$
DECLARE
  target text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon')
     OR NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    RAISE NOTICE 'anon/authenticated roles not present — skipping REVOKE';
    RETURN;
  END IF;

  FOREACH target IN ARRAY ARRAY[
    'profiles', 'coin_packages', 'product_presets', 'templates', 'holidays', 'settings'
  ] LOOP
    EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', target);
  END LOOP;
END
$grants$;
