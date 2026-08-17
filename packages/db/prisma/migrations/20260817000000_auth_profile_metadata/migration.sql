-- Extends the Supabase Auth bridge added in the initial migration.
--
-- Registration now collects a name and an optional WhatsApp number (P1-US-201),
-- and Google sign-in supplies a name under a different key. The trigger copies all
-- of it into `public.profiles` at the moment the auth user is created, so the
-- application never has to write that row itself.
--
-- Guarded the same way as the original: `prisma migrate dev` replays migrations
-- against a shadow database that has no `auth` schema, and an unguarded reference
-- fails the whole command with P3006.

CREATE OR REPLACE FUNCTION "public"."handle_new_user"()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  meta jsonb := COALESCE(NEW."raw_user_meta_data", '{}'::jsonb);
  resolved_name text;
  resolved_phone text;
BEGIN
  -- Email/password signup sends `name`; Google sends `full_name`, and `name` as a
  -- fallback. Take the first that is actually present.
  resolved_name := NULLIF(TRIM(COALESCE(meta ->> 'name', meta ->> 'full_name', '')), '');
  resolved_phone := NULLIF(TRIM(COALESCE(meta ->> 'phone', '')), '');

  INSERT INTO "public"."profiles" ("id", "name", "phone")
  VALUES (NEW."id", resolved_name, resolved_phone)
  ON CONFLICT ("id") DO UPDATE
    SET "name" = COALESCE("public"."profiles"."name", EXCLUDED."name"),
        "phone" = COALESCE("public"."profiles"."phone", EXCLUDED."phone");

  RETURN NEW;
END;
$$;

DO $bridge$
BEGIN
  IF to_regclass('auth.users') IS NULL THEN
    RAISE NOTICE 'auth.users not present (shadow database?) — skipping trigger refresh';
    RETURN;
  END IF;

  DROP TRIGGER IF EXISTS "on_auth_user_created" ON "auth"."users";
  CREATE TRIGGER "on_auth_user_created"
    AFTER INSERT ON "auth"."users"
    FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_user"();
END
$bridge$;

-- Account deletion is a soft delete (NFR-P03): the row stays so financial records
-- can be anonymised rather than orphaned, and a purge job removes photos, projects
-- and exports within 7 days. This index keeps that job's scan cheap.
-- Plain rather than partial: Prisma has no way to express a partial index in
-- schema.prisma, so a `WHERE deleted_at IS NOT NULL` clause here would read as
-- drift on every `prisma migrate dev`.
CREATE INDEX "profiles_deleted_at_idx" ON "profiles"("deleted_at");
