---
name: db-and-rls
description: "Procedure for schema changes, Prisma migrations, new tables, and Supabase configuration. Trigger whenever a task creates or alters a table, writes a migration, touches RLS policies, or configures database connection strings. Supabase auto-exposes public tables through a REST API, which makes an unguarded table world-readable."
---

# Schema and database changes

## Connection strings

Prisma needs both. Getting this wrong fails in confusing ways.

```
DATABASE_URL="postgresql://…pooler.supabase.com:6543/postgres?pgbouncer=true"  # app
DIRECT_URL="postgresql://…supabase.com:5432/postgres"                          # migrations
```

`DIRECT_URL` is declared in `schema.prisma` under `directUrl`. Migrations run through the pooler will not behave.

## Every new table

1. Create it via a Prisma migration. Never through the Supabase dashboard, never by hand.
2. **Enable RLS and add a deny-all policy in the same migration.** Supabase exposes `public` schema tables through PostgREST, reachable with the anon key that lives in the browser. A table without RLS is a public table.
3. The application server uses the service-role key and bypasses RLS. That key is server-only: never in a `NEXT_PUBLIC_` variable, never in a client component, never in a bundled file.
4. CI fails the build if a migration creates a table without enabling RLS. Do not disable that check.

## Storage discipline

The database is 500 MB on the Supabase free tier. No images, no PDFs, no version snapshots in Postgres — Cloudflare R2 only. Columns ending in `_key` store object-storage keys, never URLs; URLs are signed at request time.

If a table will accumulate rows indefinitely (`audit_logs`, `export_jobs`), write the archival job in the same piece of work, not later.

## Ownership

Every query for projects, assets, exports or orders filters by the caller's `user_id`. "The route is already authenticated" is not sufficient — that reasoning is how IDOR bugs get written.

## Before reporting done

- [ ] Migration exists and applies cleanly from scratch
- [ ] RLS enabled with deny-all on every new table
- [ ] No large blob column added
- [ ] Ownership filter present on every new query path
