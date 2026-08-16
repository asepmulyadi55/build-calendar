# BuildCalendar

Print-ready calendars from your own photos, with Indonesian public holidays filled in automatically. Users pick a design, drop in photos, preview the result, then unlock a 300 DPI print-ready PDF with prepaid coins — or ask us to print and ship it.

**Status:** repository skeleton (P1-US-001). The app boots, the database schema and CI gates exist, and no product feature is implemented yet.
**Target:** live for the 2028 calendar season, October–December 2027.

---

## Setup

### Prerequisites

| Tool    | Version    | Why                                                         |
| ------- | ---------- | ----------------------------------------------------------- |
| Node.js | ≥ 20.11    | Next.js 15 and the renderer                                 |
| pnpm    | 10.x       | Workspaces. `corepack enable` installs it                   |
| Docker  | any recent | Redis locally; the renderer must be tested under a 1 GB cap |

There is no local Postgres. The database is Supabase (remote), on purpose — developing against the real thing is what catches pooler and RLS problems early.

### Steps

```bash
# 1. Install
pnpm install

# 2. Configure. Every variable is commented in .env.example.
cp .env.example .env
#    Minimum to boot: DATABASE_URL and DIRECT_URL from your Supabase project
#    (Dashboard → Connect). DATABASE_URL is the pooled 6543 URL and must keep
#    ?pgbouncer=true; DIRECT_URL is the 5432 one and is used only by migrations.

# 3. Create the schema in Supabase, then fill in reference data
pnpm db:migrate
pnpm db:seed

# 4. Run it — starts Redis in Docker, then web and renderer
pnpm dev
```

Then:

- <http://localhost:3000> — the app
- <http://localhost:3000/api/health> — `200` with `{"status":"ok"}` once the database answers, `503` when it does not
- <http://localhost:4000/health> — the renderer worker

Ports already in use? `REDIS_PORT` in `.env` moves Redis (point `REDIS_URL` at the same number), `WEB_PORT` moves the published port of the web _container_, and `PORT=3010 pnpm dev` moves Next during development.

`pnpm dev` reads the root `.env` for both apps. Compose is always invoked with `--project-directory .` for the same reason — run it from inside `infra/` and every `${VARIABLE}` in the compose file is silently ignored.

### Verifying without a database

Everything except `db:migrate`, `db:seed` and a green `/api/health` works with placeholder connection strings:

```bash
pnpm check:rls && pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

`pnpm build` needs `DATABASE_URL` and `DIRECT_URL` to be set to something syntactically valid; it never connects.

---

## Commands

| Command                     | Does                                                          |
| --------------------------- | ------------------------------------------------------------- |
| `pnpm dev`                  | Redis in Docker, then `web` (3000) and `renderer` (4000)      |
| `pnpm dev:stop`             | Stops the Compose stack                                       |
| `pnpm build`                | Prisma client, then both apps                                 |
| `pnpm test`                 | Vitest across every workspace package                         |
| `pnpm typecheck`            | `tsc --noEmit` everywhere. CI fails on any error              |
| `pnpm lint` / `pnpm format` | ESLint / Prettier                                             |
| `pnpm check:rls`            | Fails if a migration creates a table without RLS + deny-all   |
| `pnpm db:migrate`           | `prisma migrate dev` over `DIRECT_URL`                        |
| `pnpm db:deploy`            | `prisma migrate deploy` — use this in production              |
| `pnpm db:seed`              | Coin packages, product presets, holidays, templates, settings |
| `pnpm db:studio`            | Prisma Studio                                                 |

Docker Compose lives in `infra/`. The renderer must always be tested under its real limit:

```bash
docker compose -f infra/docker-compose.yml up --build
docker run -m 1g …          # renderer memory work — see spike/README.md
```

---

## Repository layout

```
apps/
  web/                 Next.js 15 App Router — marketing, app, admin (only a health check so far)
  renderer/            Node + BullMQ worker; the render pipeline itself is P1-US-601
packages/
  db/                  Prisma schema, migrations, seed, shared client
  ui/                  Design tokens (src/theme.css). Components arrive with the stories that need them
infra/
  docker-compose.yml   web, renderer, redis, caddy — no Postgres, by design
  Dockerfile.web       Standalone Next build, mem_limit 400m
  Dockerfile.renderer  Chromium + fonts baked in, mem_limit 500m
  Caddyfile            TLS and reverse proxy
  backup.sh            Nightly pg_dump to R2
scripts/
  check-rls.mjs        The CI gate that keeps Supabase tables from being world-readable
spike/                 P1-US-000 throwaway. Delete once DECISIONS.md records its findings
docs/                  Specification. Read 00, 01, DECISIONS before writing code
design/                Clickable HTML prototype. assets/ds.css is the source for the tokens
```

### What the skeleton deliberately does not contain

- `packages/calendar-core` — P1-US-002
- Authentication, sign-in, sign-up — Epic 2
- Any page other than `/` and `/api/health`
- UI components — P1-US-003 ships them when there is a screen to put them on
- The transactional tables (`coin_transactions`, `payments`, `projects`, `export_jobs`, …) — each arrives with the story that owns it, and each must ship RLS in the same migration

---

## How the gates work

Three things fail the build, and none of them should be worked around:

**`pnpm check:rls`** — Supabase publishes every `public` table through PostgREST, reachable with the anon key that ships in the browser. A table without RLS is a world-readable table. The check parses the migrations and fails if a `CREATE TABLE` is missing `ENABLE ROW LEVEL SECURITY` or a deny-all policy.

**`pnpm typecheck`** — TypeScript strict, plus `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`. CI fails on any type error.

**The 1 GB memory budget** — `infra/docker-compose.yml` caps `web` at 400 MB, `renderer` at 500 MB and `redis` at 64 MB (RQ-MEM-06). `MALLOC_ARENA_MAX=2` is set in both Dockerfiles because without it a long-lived Node worker's RSS climbs with every job; see `spike/REPORT.md` §3.1 for the measurements.

---

## Conventions

- Interface English, calendar output Bahasa Indonesia. See master spec §10.7. Application strings live in `apps/web/src/lib/i18n/en.ts` and nowhere else; month and weekday names will live in `calendar-core` and never in `en.ts`.
- Code, identifiers and comments English. User-facing routes English.
- Number formatting stays `id-ID` — `Rp1.250.000`, week starts Monday.
- All design coordinates are in millimetres. Pixels exist only in the view layer.
- One epic per working session, reviewed before the next begins.

## Where to start

1. Open `design/index.html` in a browser and click through the prototype.
2. Read `docs/DECISIONS.md`. It is short, and it explains the constraints that shape everything else.
3. Read `spike/REPORT.md` — the print pipeline is already measured, including three decisions still open.
