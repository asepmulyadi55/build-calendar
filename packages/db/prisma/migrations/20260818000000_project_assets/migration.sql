-- CreateTable
CREATE TABLE "project_assets" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "project_id" UUID,
    "storage_key_print" TEXT NOT NULL,
    "storage_key_preview" TEXT NOT NULL,
    "storage_key_thumb" TEXT NOT NULL,
    "width_px" INTEGER NOT NULL,
    "height_px" INTEGER NOT NULL,
    "mime" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "filename" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "project_assets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "project_assets_user_id_deleted_at_idx" ON "project_assets"("user_id", "deleted_at");

-- CreateIndex
CREATE INDEX "project_assets_project_id_idx" ON "project_assets"("project_id");

-- AddForeignKey
ALTER TABLE "project_assets" ADD CONSTRAINT "project_assets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_assets" ADD CONSTRAINT "project_assets_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- ============================================================================
-- Row Level Security (01-tech-stack-and-infrastructure.md §5.3)
--
-- These rows point at customer photographs. Supabase publishes every `public`
-- table through PostgREST with the anon key that ships in the browser, so an
-- unguarded table here would hand out the storage keys for family photos.
--
-- Deny-all: all access goes through our own server, and every query filters by
-- the caller's `user_id` (NFR-S04).
-- ============================================================================

ALTER TABLE "public"."project_assets" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_all" ON "public"."project_assets" AS RESTRICTIVE
  FOR ALL TO public USING (false) WITH CHECK (false);

DO $grants$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon')
     OR NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    RAISE NOTICE 'anon/authenticated roles not present — skipping REVOKE';
    RETURN;
  END IF;

  EXECUTE 'REVOKE ALL ON public.project_assets FROM anon, authenticated';
END
$grants$;
