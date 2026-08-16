#!/usr/bin/env node
/**
 * Fails the build if a migration creates a table in `public` without enabling
 * Row Level Security and adding a deny-all policy.
 *
 * Why this exists: Supabase publishes every `public` table through PostgREST,
 * reachable with the anon key that ships in the browser bundle. A table created
 * without RLS is a world-readable table. Our server bypasses RLS with the
 * service-role key, so nothing in the app tells us when we have forgotten —
 * only this check does (`docs/01-tech-stack-and-infrastructure.md` §5.3).
 *
 * Do not "fix" a failure by editing this script.
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MIGRATIONS_DIR = path.join(ROOT, 'packages', 'db', 'prisma', 'migrations');

/** `CREATE TABLE [IF NOT EXISTS] "public"."x"` / `public.x` / `"x"` / `x` */
const CREATE_TABLE =
  /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:"?public"?\.)?"?([A-Za-z_][A-Za-z0-9_]*)"?/gi;

const ENABLE_RLS =
  /ALTER\s+TABLE\s+(?:"?public"?\.)?"?([A-Za-z_][A-Za-z0-9_]*)"?\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/gi;

const CREATE_POLICY =
  /CREATE\s+POLICY\s+"?[^"\s]+"?\s+ON\s+(?:"?public"?\.)?"?([A-Za-z_][A-Za-z0-9_]*)"?([\s\S]*?);/gi;

function collect(regex, sql) {
  const found = new Map();
  for (const match of sql.matchAll(regex)) {
    found.set(match[1], match[0] + (match[2] ?? ''));
  }
  return found;
}

function migrationFiles() {
  if (!existsSync(MIGRATIONS_DIR)) return [];
  return readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(MIGRATIONS_DIR, entry.name, 'migration.sql'))
    .filter((file) => existsSync(file))
    .sort();
}

function main() {
  const files = migrationFiles();

  if (files.length === 0) {
    console.log('check-rls: no migrations found, nothing to check');
    return;
  }

  const created = new Map(); // table -> migration file that created it
  const rlsEnabled = new Set();
  const denyAll = new Set();

  for (const file of files) {
    const sql = readFileSync(file, 'utf8');
    const relative = path.relative(ROOT, file);

    for (const table of collect(CREATE_TABLE, sql).keys()) {
      if (!created.has(table)) created.set(table, relative);
    }
    for (const table of collect(ENABLE_RLS, sql).keys()) {
      rlsEnabled.add(table);
    }
    for (const [table, statement] of collect(CREATE_POLICY, sql)) {
      // A deny-all policy is one whose USING clause can never be true.
      if (/USING\s*\(\s*false\s*\)/i.test(statement)) denyAll.add(table);
    }
  }

  const problems = [];
  for (const [table, file] of created) {
    if (!rlsEnabled.has(table)) {
      problems.push(`${table} — created in ${file} without ENABLE ROW LEVEL SECURITY`);
    } else if (!denyAll.has(table)) {
      problems.push(`${table} — RLS enabled but no deny-all policy (USING (false))`);
    }
  }

  console.log(
    `check-rls: ${files.length} migration(s), ${created.size} table(s), ` +
      `${rlsEnabled.size} with RLS, ${denyAll.size} with a deny-all policy`,
  );

  if (problems.length > 0) {
    console.error(
      '\ncheck-rls FAILED — every table in `public` must have RLS and a deny-all policy:',
    );
    for (const problem of problems) console.error(`  - ${problem}`);
    console.error(
      '\nAdd this to the migration that creates the table:\n' +
        '  ALTER TABLE "public"."<table>" ENABLE ROW LEVEL SECURITY;\n' +
        '  CREATE POLICY "deny_all" ON "public"."<table>" AS RESTRICTIVE\n' +
        '    FOR ALL TO public USING (false) WITH CHECK (false);\n',
    );
    process.exit(1);
  }

  console.log('check-rls: OK');
}

main();
