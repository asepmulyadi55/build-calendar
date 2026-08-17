-- CreateEnum
CREATE TYPE "project_status" AS ENUM ('draft', 'unlocking', 'unlocked');

-- CreateTable
CREATE TABLE "projects" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "product_preset_id" UUID NOT NULL,
    "template_id" UUID,
    "year" INTEGER NOT NULL,
    "start_month" INTEGER NOT NULL DEFAULT 1,
    "design_json" JSONB NOT NULL,
    "schema_version" INTEGER NOT NULL,
    "design_bytes" INTEGER NOT NULL DEFAULT 0,
    "status" "project_status" NOT NULL DEFAULT 'draft',
    "thumbnail_key" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "projects_user_id_deleted_at_idx" ON "projects"("user_id", "deleted_at");

-- CreateIndex
CREATE INDEX "projects_product_preset_id_idx" ON "projects"("product_preset_id");

-- CreateIndex
CREATE INDEX "projects_template_id_idx" ON "projects"("template_id");

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_product_preset_id_fkey" FOREIGN KEY ("product_preset_id") REFERENCES "product_presets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- ============================================================================
-- Row Level Security (01-tech-stack-and-infrastructure.md §5.3)
--
-- Supabase publishes every table in `public` through PostgREST, reachable with
-- the anon key that ships in the browser. `projects` holds the design a customer
-- paid to unlock, so an unguarded table here is not a theoretical problem.
--
-- Deny-all is correct: all access goes through our own server using the
-- service-role key, and every query filters by the caller's `user_id`. RLS is the
-- safety net for the day a key leaks, not the primary boundary.
-- ============================================================================

ALTER TABLE "public"."projects" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_all" ON "public"."projects" AS RESTRICTIVE
  FOR ALL TO public USING (false) WITH CHECK (false);

DO $grants$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon')
     OR NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    RAISE NOTICE 'anon/authenticated roles not present — skipping REVOKE';
    RETURN;
  END IF;

  EXECUTE 'REVOKE ALL ON public.projects FROM anon, authenticated';
END
$grants$;
