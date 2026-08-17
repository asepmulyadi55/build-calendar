# Tech Stack & Infrastructure

> Companion to `00-master-spec.md`. This document records **what we build on and why**, with the constraints of a Supabase free-tier database taken as a given.
> Tier figures verified August 2026. **Re-verify before committing money** — provider pricing changes.

---

## 1. The Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 15 (App Router) + TypeScript** | One repo for marketing pages, the app, and the API |
| UI | **Tailwind CSS + shadcn/ui** | Fast, consistent, no design-system build-out |
| Database | **Supabase Postgres** (free tier initially) | Managed Postgres, generous free tier, easy upgrade path |
| Auth | **Supabase Auth** | Email verification, password reset, and Google OAuth out of the box; 50,000 MAU free |
| ORM | **Prisma** | Migration discipline, heavily documented (matters for an AI executor) |
| Object storage | **Cloudflare R2** — *not* Supabase Storage | 10 GB free, and **zero egress fees**. See §3.1; this is the most important decision in this document |
| Image processing | **sharp** | Resize, EXIF handling, HEIC conversion |
| Canvas / editor | **Fabric.js v6** | Mature JSON serialization; used identically in editor and renderer |
| Render engine | **Puppeteer (headless Chromium)** in a separate worker | Millimetre-accurate vector PDF |
| Queue | **BullMQ + Redis** (Redis in Docker on our own VPS) | Free, simple, no extra vendor |
| Email | **Resend** (or Brevo) as custom SMTP | Supabase's built-in mailer is rate-limited and not for production (§5.2) |
| Hosting | **AWS Lightsail 1 GB, Singapore, Docker Compose** | Chromium and Redis need a real server; Singapore keeps latency low for Indonesia and matches the Supabase region. Memory budget in §4.2 is binding |
| Monitoring | Sentry free + UptimeRobot free | Error tracking and the anti-pause ping in one |

### 1.1 Repository Layout

```
/apps
  /web            # Next.js: marketing, user app, admin panel
  /renderer       # Node + Puppeteer + BullMQ worker
/packages
  /calendar-core  # calendar layout, grid, holiday resolver, Design JSON types
  /ui             # shared components
  /db             # Prisma schema + client
/infra
  docker-compose.yml, Dockerfile.web, Dockerfile.renderer, backup.sh
```

---

## 2. What We Deliberately Do **Not** Use

| Not used | Reason |
|---|---|
| **Supabase Storage** | 1 GB free and, worse, its egress counts against a 5 GB/month total. See §3.1 |
| **Supabase Edge Functions** | Deno runtime; cannot run headless Chromium. All rendering is on our VPS |
| **Supabase Realtime** | No collaborative editing in scope. Export status uses polling |
| **Vercel Hobby** | Free, but its terms exclude commercial use — and we are selling coins. If Vercel is wanted later, it is the paid tier |
| **Serverless functions for rendering** | Chromium cold starts, binary size, and execution time limits all fight against a 45-second PDF job |
| **Supabase auto-generated REST API (PostgREST)** from the browser | All data access goes through our own server routes, so business rules stay in one place |

---

## 3. The Supabase Free Tier: What It Gives, and Where It Breaks

<cite index="19-1">The free tier provides 500 MB database storage, 1 GB file storage, 5 GB egress bandwidth, 50,000 monthly active users, 500,000 edge function invocations, and up to 2 active projects, on shared CPU with 500 MB RAM.</cite> <cite index="17-1">Free projects also pause automatically after 7 days without a database request and must be manually resumed from the dashboard.</cite> <cite index="22-1">Daily backups are not included on the free tier; they begin at Pro.</cite>

### 3.1 The Storage Problem — and Why R2 Is Mandatory

This product is photo-heavy and produces very large output files. Rough per-project arithmetic:

| Item | Size |
|---|---|
| One processed photo (print derivative, ≤ 4000 px, q90) | ~2.5 MB |
| Preview (1200 px) + thumbnail (300 px) | ~0.3 MB |
| A 13-photo desk calendar project, images only | **~36 MB** |
| One exported 13-sheet desk calendar PDF | **~20 MB** |
| One exported 12-sheet A3 wall calendar PDF | **~35 MB** |
| A realistic paying project (images + a few export versions) | **~90–150 MB** |

Against Supabase's 1 GB file storage, that is roughly **7 to 11 projects total**. The application would hit the wall before its tenth paying customer.

The egress ceiling is even tighter. <cite index="21-1">Free-tier outbound bandwidth is 5 GB per month across database, storage, Auth, API, and functions combined; beyond the paid tiers it costs $0.09 per GB.</cite> A 35 MB PDF downloaded 140 times consumes the entire monthly allowance — and users re-download freely by design (BR-U03, BR-U07). Our core product promise is directly at war with this limit.

Cloudflare R2 removes both problems. <cite index="24-1">Its free tier includes 10 GB-month of storage, 1 million Class A operations, and 10 million Class B operations, with free egress.</cite> <cite index="26-1">Beyond that, storage is $0.015 per GB-month, Class A operations $4.50 per million, and Class B $0.36 per million, and egress is $0.00 per GB at any volume.</cite>

Concretely: 500 stored projects ≈ 45 GB ≈ **$0.68 per month**, with unlimited downloads at no additional cost. Recommended rules regardless:

- Discard the original upload once derivatives exist; keep only print, preview, and thumbnail.
- Cap the print derivative at exactly what 300 DPI requires for the largest slot it could fill — do not store 12 MP when 3 MP suffices.
- Embed JPEGs at quality 85–90 in exported PDFs; the visual difference in print is negligible and file size roughly halves.
- Retain only the three most recent export files per project; older ones are regenerable from the design.
- Serve everything through Cloudflare's CDN so repeat downloads do not even become R2 read operations.

### 3.2 The 500 MB Database

What actually consumes it:

| Data | Estimate |
|---|---|
| `design_json` per template project | 50–150 KB raw, meaningfully smaller after Postgres TOAST compression |
| `design_json` per custom-editor project (Phase 3) | 300 KB – 1 MB raw |
| `regions` (Indonesian provinces, cities, districts) | ~2 MB, loaded once |
| Everything else (users, orders, ledger, jobs) | Small; kilobytes per row |

Realistic capacity is on the order of **2,000–3,000 projects**. At Rp2,000 per unlock, that represents several million rupiah of revenue — by which point Pro at $25/month is trivially affordable. The free tier is not the long-term plan; it is a genuinely adequate starting point.

Rules that protect the quota:

- **AR-07 applies**: no images, no PDFs, no version snapshots in Postgres. Only pointers.
- Phase 3 version history writes snapshots to R2, not to a database table.
- `audit_logs` and `export_jobs` older than 90 days get archived to R2 and deleted by a monthly job.
- Track `projects.design_bytes` so growth is measurable. When total design storage passes ~250 MB, migrate `design_json` to R2 and keep only a `design_key` — the schema already anticipates this.
- Set a Supabase usage alert at 70% of the database quota. <cite index="25-1">Once a limit is exceeded and the grace period passes, the database can be switched to read-only, storage uploads blocked, or API requests returned as 402 errors — and a second grace period is not granted.</cite> A read-only database means users cannot save work or top up.

### 3.3 The 7-Day Pause

<cite index="17-1">Any free project with no database request for seven consecutive days is paused, and must be manually resumed from the dashboard.</cite> For a live commercial site this is a real hazard: a quiet week during development, or a slow period after launch, and paying users hit errors.

- **During development:** point UptimeRobot at a `/api/health` endpoint that performs a trivial query, every 15 minutes. This also gives free uptime alerting.
- **Before accepting real payments:** treat Pro ($25/month) as a launch cost, not an upgrade. It removes the pause and adds daily backups.

### 3.4 Backups Are Not Optional

There are no daily backups on the free tier, and this application holds a coin ledger — that is customer money. Before the first payment is accepted:

- A nightly cron on the VPS runs `pg_dump` and uploads the result to a separate R2 bucket, retained 14 days.
- **Perform one restore drill.** A backup that has never been restored is a hypothesis, not a backup.
- Store the R2 backup credentials separately from the application's credentials.

---

## 4. Recommended Deployment

### 4.1 Topology

```
                    Cloudflare (DNS, CDN, WAF)
                              │
                  ┌───────────┴────────────┐
                  │ Lightsail 1 GB — SGP   │
                  │ Docker Compose + 2G swap│
                  │                        │
                  │ next.js (web)   ≤400m  │──── Supabase Postgres + Auth (Singapore)
                  │ renderer worker ≤500m  │──── Cloudflare R2 (photos, PDFs, backups)
                  │   └ chromium: on-demand│
                  │ redis (queue)   ≤64m   │
                  │ caddy (TLS)            │
                  └────────────────────────┘
```

Keep the VPS and the Supabase project in the **same region (Singapore, `ap-southeast-1`)**. Cross-region database round trips will make the editor's autosave feel sluggish from Indonesia.

### 4.2 Server: AWS Lightsail, 1 GB — and the Memory Budget It Forces

**Decided: AWS Lightsail $7/month plan (1 GB RAM, 2 vCPU), Singapore region.** See `DECISIONS.md` ADR-0002 for the reasoning. Singapore rather than Jakarta because Supabase has no Jakarta region, and a Jakarta instance would add a cross-region hop on every database round trip.

This is a deliberately tight budget. It is workable, but **only because the render path is vector-based**: Puppeteer's `page.pdf()` emits vector text and embeds images at their source resolution. It does not rasterize a full 300 DPI canvas, so an A3 page never needs a 3508 × 4961 framebuffer. Memory is dominated by the Chromium process itself plus decoded source images.

Working budget:

| Component | Expected RSS |
|---|---|
| OS + Docker daemon | ~250 MB |
| Next.js (production build) | ~250–300 MB |
| Redis + Caddy | ~70 MB |
| **Idle subtotal** | **~600 MB** |
| Chromium, spawned only during a job | ~300–400 MB |
| Decoded source image (3000 × 2000) | ~24 MB |
| **Peak during render** | **~950 MB** |

That leaves almost no headroom, so the following are **hard requirements, not optimizations**. Every one of them must be implemented in Phase 1.

- **RQ-MEM-01 — On-demand Chromium lifecycle.** The renderer launches Chromium when a job arrives and terminates it after 60 seconds idle. It is never kept warm. This is the single largest saving: it keeps 300–400 MB out of the idle footprint, and it also discards any accumulated leak between jobs. Accept the ~1 second cold start.
- **RQ-MEM-02 — One sheet at a time.** Render each sheet to a single-page PDF and merge with `pdf-lib`. Peak memory stays flat regardless of sheet count. Never assemble all sheets in memory.
- **RQ-MEM-03 — Pre-size images with sharp before Chromium sees them.** Resize each image to exactly the pixel dimensions its slot needs at 300 DPI, then hand Chromium the resized buffer. Never let Chromium decode a 4000 px source for a slot that renders at 1500 px. This is the difference between 48 MB and 7 MB per image.
- **RQ-MEM-04 — Queue concurrency locked to 1.** BullMQ `concurrency: 1`, enforced in config, with a comment pointing at this section. Raising it requires a bigger instance first.
- **RQ-MEM-05 — 2 GB swap file** on the instance SSD. Swap is not a substitute for RAM, but it converts an out-of-memory kill into slow completion. Without it, the Linux OOM killer targets the largest process — which is Next.js, not Chromium — and a single export would take the whole website down.
- **RQ-MEM-06 — Memory caps in Docker Compose.** `mem_limit` set per service (`web: 400m`, `renderer: 500m`, `redis: 64m`) so one runaway container cannot starve the others. A container hitting its own limit fails one job; an uncapped one fails the whole box.
- **RQ-MEM-07 — Chromium flags:** `--disable-dev-shm-usage`, `--disable-gpu`, `--no-sandbox` (inside the container), `--single-process` where stable, and `--js-flags="--max-old-space-size=256"`.
- **RQ-MEM-08 — Job timeout of 5 minutes**, after which the job fails cleanly and Chromium is killed. A hung render must never occupy memory indefinitely.

Expected performance under this configuration: a 13-sheet desk calendar in roughly 40–90 seconds, a 12-sheet A3 in roughly 1.5–3 minutes. Slower than a 4 GB box, but the queue is asynchronous and the user watches a progress indicator, so latency here costs far less than it would in a synchronous flow.

**Measure before trusting any of this.** The Phase 1 spike (P1-US-000) runs the renderer in a container capped at 1 GB and records actual peak RSS. That measurement, not this table, is the decision input.

**Degradation plan, in order, if the measurement comes in over budget:**

1. Reduce the print-derivative cap (e.g. long edge 3000 px instead of 4000). Print quality impact is negligible at these trim sizes.
2. Move the renderer off the box during development and run it locally (already the plan — see ADR-0003).
3. Restrict launch to desk calendars only and defer the A2 single-sheet product, which is the heaviest page.
4. Upgrade to the $12 (2 GB) plan. Lightsail bills hourly against a monthly cap, so a mid-month upgrade is cheap.

Attach a **static IP from day one.** Upgrading a Lightsail instance means snapshot → new instance; without a static IP, every upgrade forces a DNS change and a propagation wait.

### 4.3 Cost Projection

| Stage | Monthly cost |
|---|---|
| Development (renderer runs locally) | Lightsail $7 + Supabase $0 + R2 $0 ≈ **$7** |
| Soft launch (< 50 users) | Same ≈ **$7**, plus nightly backups and an uptime ping |
| First real revenue | Lightsail $7–12 + Supabase Pro $25 + R2 ~$1 ≈ **$33–38** |
| ~500 active projects | Lightsail $24 + Supabase Pro $25 + R2 ~$1 ≈ **$50** |

Break-even against infrastructure at the soft-launch stage is roughly **7 top-ups per month** at Rp10,000. Domain (~$12/year) and email (free tier) are rounding errors.

Note that Lightsail's three-months-free promotion applies to the $5–$12 Linux bundles, so the $7 plan qualifies. Also note that **stopping a Lightsail instance does not stop billing** — only deletion does.

---

## 5. Implementation Gotchas

These are specific, known traps in this stack. Each one costs hours if discovered late.

### 5.1 Prisma + Supabase Connection URLs

Supabase exposes both a pooled connection and a direct one. Prisma needs **both**:

```
DATABASE_URL="postgresql://...@...pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://...@...supabase.com:5432/postgres"
```

`DATABASE_URL` (pooled, port 6543) serves the application; `DIRECT_URL` (port 5432) is declared in `schema.prisma` under `directUrl` and is used for migrations. Running migrations through the pooler fails in confusing ways. Prepared statements must be disabled on the pooled connection — hence `?pgbouncer=true`.

### 5.2 Supabase Auth Email Is Not Production-Ready

The built-in email sender is rate-limited to a handful of messages per hour and is intended for development only. **Configure custom SMTP (Resend or Brevo) before any real signup flow is tested**, or verification emails will silently stop arriving and the failure will look like a bug in your own code.

Also configure: redirect URL allowlist, English email templates, and a password policy of at least 8 characters.

### 5.3 PostgREST Exposure — Read This Before Creating Any Table

Supabase automatically exposes `public` schema tables through an auto-generated REST API reachable with the anon key, which by design lives in the browser. A table created without Row Level Security is world-readable.

Our architecture routes all access through our own server, so RLS is not the primary boundary — but it must still be the safety net:

- Enable RLS on **every** table in `public`.
- Default to a **deny-all** policy. The server uses the service-role key and bypasses RLS.
- The service-role key is server-only. It must never appear in a `NEXT_PUBLIC_` variable, a client component, or a bundled file.
- Add a CI check that fails the build if any migration creates a table without enabling RLS.

<cite index="17-1">Note also that projects created after 30 May 2026 must add explicit Postgres grants for PostgREST access, and existing free projects are affected from 30 October 2026</cite> — verify how this interacts with your setup before that date.

### 5.4 The `profiles` Bridge

Supabase Auth owns the `auth.users` table; Prisma should not manage it. The standard pattern:

- Create `public.profiles` with `id uuid primary key references auth.users(id) on delete cascade`.
- A Postgres trigger on `auth.users` insert creates the matching profile row.
- Prisma models `profiles` and treats `auth.users` as external.
- All foreign keys in application tables point at `profiles.id`.

### 5.5 Fonts in the Renderer

The renderer's Docker image must contain **every font any template can use**. A font missing from the image silently falls back to a default, and the exported PDF will not match the preview — a WYSIWYG violation (AR-01) that users will discover only after paying.

- Install fonts into the image at build time; never fetch them at render time.
- Maintain `packages/calendar-core/fonts.ts` as the single allowlist, consumed by both the editor's font picker and the image build.
- Adding a font to the picker without rebuilding the renderer image is a release blocker.
- Disable all outbound network access in the render context: it prevents SSRF and guarantees deterministic output.

### 5.6 Coin Ledger Concurrency

The unlock path is the one place where a bug costs real money. Two simultaneous requests must never both succeed.

- Wrap the deduction, ledger insert, and status change in a single transaction.
- Add a partial unique index: `unique (project_id) where reason = 'unlock'`. The database, not application logic, is what makes double-spending impossible.
- Make the endpoint idempotent — a repeated request on an already-unlocked project returns success without charging.
- Write the concurrency test first, before the implementation.

---

## 6. Environment Variables

### 6.1 Obtaining R2 credentials

Cloudflare dashboard → **R2 Object Storage** → **Overview**.

1. **Account ID** is in the right-hand panel, 32 hex characters.
2. Under **Account Details**, select **Manage** next to API Tokens, then **Create API Token**.
   - Permission: **Object Read & Write**
   - Scope: **specify the bucket**, never "all buckets"
   - The Access Key ID and Secret Access Key are shown **once only**. Copy them immediately; if missed, delete the token and create another.
3. The S3 endpoint is derived from the Account ID: `https://<account-id>.r2.cloudflarestorage.com`. Do not append the bucket name — the bucket is a separate SDK parameter.
4. `R2_REGION` is `auto`. The SDK requires a region; R2 ignores it.

Create two buckets: one for application assets, one for database backups. **Issue separate API tokens for each**, so a leak of the application key does not also expose the backups.

`R2_PUBLIC_BASE_URL` is for genuinely public assets only — template thumbnails and marketing images, served through a custom domain on the bucket. **User photos, exports, and payment proofs are private** and reachable only through signed URLs (NFR-S04); they never go through this base URL. Leave the variable empty until a domain exists. The built-in `r2.dev` subdomain is rate-limited and not intended for production.

### 6.2 The variables

```bash
# App
SITE_NAME="BuildCalendar"
NEXT_PUBLIC_APP_URL="https://..."

# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://xxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="..."
SUPABASE_SERVICE_ROLE_KEY="..."        # server only — never expose
DATABASE_URL="...pooler...:6543/postgres?pgbouncer=true"
DIRECT_URL="...:5432/postgres"

# Cloudflare R2
R2_ACCOUNT_ID="8f4c2a1b9e7d6035f1a8c4b2d9e60371"
R2_ENDPOINT="https://8f4c2a1b9e7d6035f1a8c4b2d9e60371.r2.cloudflarestorage.com"
R2_REGION="auto"
R2_ACCESS_KEY_ID="1a2b3c4d5e6f70819a2b3c4d5e6f7081"
R2_SECRET_ACCESS_KEY="7d3f9b2e5c8a1046f2b7d4e9a3c6081b5f2e8d1a4c7b0369e2f5a8d1b4c70e93"
R2_BUCKET="kalender-assets"
R2_BACKUP_BUCKET="kalender-backups"
R2_PUBLIC_BASE_URL=""                  # only once a custom domain exists

# Queue
REDIS_URL="redis://redis:6379"

# Email
RESEND_API_KEY="..."
MAIL_FROM="noreply@..."

# Renderer
RENDERER_URL="http://renderer:4000"
RENDERER_SHARED_SECRET="..."

# Observability
SENTRY_DSN="..."
```

The R2 values above are correctly formatted examples, not real credentials.

---

## 7. Pre-Launch Checklist

Before the first real payment is accepted:

- [ ] Peak RSS measured for the heaviest product (A2 single sheet) and confirmed under the §4.2 budget
- [ ] 2 GB swap file active and surviving a reboot (`/etc/fstab` entry verified)
- [ ] Docker `mem_limit` set on every service; an OOM in the renderer confirmed **not** to take down `web`
- [ ] Static IP attached to the Lightsail instance
- [ ] Nightly `pg_dump` to R2 is running **and one restore has been tested**
- [ ] Custom SMTP configured and verification emails confirmed arriving
- [ ] RLS enabled with deny-all policies on every table; service-role key confirmed absent from the client bundle
- [ ] UptimeRobot pinging `/api/health` every 15 minutes
- [ ] Supabase usage alerts set at 70% for database and bandwidth
- [ ] R2 lifecycle rules configured; storage growth dashboard visible
- [ ] One physical test print produced from a real export and inspected for color, trim, and text sharpness
- [ ] Terms, Privacy Policy, and Refund Policy published — including that coins are non-refundable (BR-C03)
- [ ] Sentry receiving errors from both `web` and `renderer`
- [ ] Decision made on whether to move to Supabase Pro at launch (strongly recommended)
