# Decisions

Append-only log of architectural and product decisions. Never edit a past entry — supersede it with a new one.

Format: context, decision, consequences, status.

---

## ADR-0001 — Cloudflare R2 for all file storage, not Supabase Storage

**Date:** 2026-08 · **Status:** Accepted

**Context.** The project uses Supabase's free tier for Postgres and Auth. Supabase free includes 1 GB of file storage and 5 GB of monthly egress shared across database, storage, Auth, and API. This product is photo-heavy: a realistic paying project consumes 90–150 MB across processed images and exported PDFs, and the core product promise (BR-U03, BR-U07) is unlimited free re-export. At 1 GB the application would run out of storage at roughly the tenth paying customer, and a single 35 MB PDF downloaded 140 times would exhaust the entire monthly egress allowance.

**Decision.** All user files — photos, derivatives, exports, payment proofs, design snapshots, database backups — go to Cloudflare R2. Supabase Storage is not used at all. Supabase holds only relational data and auth.

**Consequences.** R2's free tier covers 10 GB with zero egress charges; beyond it, storage is $0.015/GB-month and egress remains free at any volume. 500 projects costs roughly $0.68/month. The application never depends on Supabase egress for file serving. Cost is decoupled from download volume, which is what makes "re-export forever" economically safe. Requires managing a second vendor and a second set of credentials.

---

## ADR-0002 — AWS Lightsail 1 GB (Singapore) as the production server

**Date:** 2026-08 · **Status:** Accepted

**Context.** The renderer requires headless Chromium, which cannot run on serverless platforms or Supabase Edge Functions. A VPS is therefore mandatory. The initial guidance called for 4 GB RAM. The owner elected to start on the $7 Lightsail plan (1 GB, 2 vCPU) on the grounds that early traffic will be low and the instance can be upgraded once there is traction.

An earlier objection — that a 300 DPI A3 page requires a ~70 MB framebuffer — was **incorrect** and is withdrawn. That figure applies to full-page rasterization. The chosen architecture uses Puppeteer's vector PDF path, which emits vector text and embeds images at source resolution without allocating a full-page canvas. Actual memory is dominated by the Chromium process (~300–400 MB) plus decoded source images (~24 MB for a 3000 × 2000 photo).

**Decision.** Production runs on Lightsail $7 (1 GB, 2 vCPU), Singapore region, with a 2 GB swap file. Singapore rather than Jakarta because Supabase has no Jakarta region and a cross-region database hop would slow editor autosave; Jakarta also receives half the bundled data transfer allowance.

The tight budget is made viable by requirements RQ-MEM-01 through RQ-MEM-08 in `01-tech-stack-and-infrastructure.md` §4.2, which are binding rather than advisory. The most significant is RQ-MEM-01: Chromium is spawned per job and terminated after 60 seconds idle, keeping 300–400 MB out of the idle footprint.

**Consequences.** Estimated idle usage ~600 MB, peak during render ~950 MB. Export latency rises to roughly 40–90 seconds for a desk calendar and 1.5–3 minutes for A3; acceptable because exports are queued and asynchronous. Queue concurrency is locked at 1, so users may wait behind one another — the UI must therefore show queue position. Infrastructure break-even falls to roughly 7 top-ups per month.

This decision is **cheap to reverse**: all state lives in Supabase and R2, and the application ships as Docker containers. Migrating to a larger instance or a different provider is roughly half a day's work. A static IP is attached from day one so upgrades do not force DNS changes.

**Verification gate.** P1-US-000 measures actual peak RSS in a 1 GB-capped container. If the measurement exceeds budget, the degradation plan in §4.2 applies, and the outcome is recorded as a new ADR superseding this one.

---

## ADR-0003 — The renderer runs locally during development

**Date:** 2026-08 · **Status:** Accepted

**Context.** Until there are users, no rendering needs to happen on the server. Development machines have far more memory than the production instance.

**Decision.** Throughout development, the renderer runs in Docker on the developer's own machine. The Lightsail instance is provisioned only when soft launch approaches.

**Consequences.** Faster iteration and no server cost during the longest phase of the project. Creates one risk: memory behaviour on a developer laptop is not representative of a 1 GB instance. Mitigated by requiring all renderer testing to run in a container capped at 1 GB (`docker run -m 1g`), and by the CI memory regression test in P1-US-601.

---

## ADR-0004 — Full product catalog at launch, not desk calendars only

**Date:** 2026-08 · **Status:** Accepted

**Context.** One proposal was to launch with desk calendars alone — the lightest product — and defer the A3 and A2 wall calendars until after a server upgrade, reducing memory risk while preserving the phased approach.

**Decision.** Launch with the full catalog. Early volume is expected to be low, and continuous heavy export is unlikely.

**Consequences.** The A2 single sheet becomes the memory-defining case and must be the subject of the P1-US-000 measurement and the CI regression test. If the measurement fails, restricting the catalog remains available as step 3 of the degradation plan — this decision would then be superseded rather than the server upgraded immediately.

---

## ADR-0005 — English interface, Indonesian market

**Date:** 2026-08 · **Status:** Accepted

**Context.** The product sells Indonesian calendars — Indonesian public holidays, Indonesian print sizes, Rupiah pricing, local couriers — to buyers in Indonesia. The original spec therefore called for a Bahasa Indonesia interface. The owner has decided the interface should be English instead.

The counter-argument was raised and considered: a consumer product aimed at families and small shop owners generally converts better in the buyer's own language, and Indonesian buyers search in Indonesian. The owner accepts this trade-off.

**Decision.** Two distinct language layers:

- **The application is English** — navigation, buttons, forms, emails, error messages, editor, admin panel. This is the tool.
- **The calendar artifact is Indonesian** — month names, weekday labels, holiday names, and the holiday legend. This is the product, and it hangs on an Indonesian wall.

The rule in one line: **English chrome, Indonesian output.**

Locale-bound data stays Indonesian regardless of layer, because translating it would make it factually wrong rather than merely unlocalized: holiday names (`Hari Raya Nyepi`, not "Day of Silence"), courier brands, administrative region names, Indonesian address structure, Rupiah, and payment terms such as QRIS. The full list is master spec §10.7.

Number and date formatting remains `id-ID` despite English copy — prices read `Rp1.250.000`, and the week starts Monday. English copy does not imply American formatting.

**Consequences.** `calendar-core` is hardcoded to `id-ID` with no locale parameter, which makes Layer 2 impossible to break from the application side. Calendar output strings live in `calendar-core` and never in `en.ts`; mixing the two is how the English interface would leak onto a printed sheet.

One subtlety must be implemented deliberately: **controls that edit printed content display the printed value.** The editor's month selector reads `Januari` while its label reads "Month". Without this rule the editor and the canvas disagree and users report it as a defect.

Copy must be written for readers whose first language is not English: short sentences, concrete vocabulary, no idioms.

A language option for the calendar artifact is explicitly **not** an MVP feature; revisit in Phase 4 only if demand appears.

Two open items follow from this decision:

1. **SEO.** Indonesian buyers search in Indonesian. Phase 4 must decide explicitly whether landing pages are written in Indonesian while the app stays English, or whether organic search is conceded in favour of paid and social acquisition. Not resolved here.
2. ~~Brand name.~~ Resolved in ADR-0006.

All application strings route through a single `en.ts`, so adding an Indonesian interface later is a translation task rather than a rewrite. This decision is reversible at moderate cost provided that rule is respected.

---

## ADR-0006 — Product name: BuildCalendar

**Date:** 2026-08 · **Status:** Accepted

**Context.** The working placeholder `KalenderKu` was Indonesian and sat awkwardly against the English interface decided in ADR-0005. Decision #10 in master §12 had been left open.

**Decision.** The product is named **BuildCalendar**. Written as one word, capital B and C.

**Consequences.** Consistent with the English interface, and descriptive enough that it needs no explanation. Closes decision #10 and unblocks visual identity work — logo, favicon, sender addresses, email templates, and OG images can now be produced.

Follow-ups, none of them blocking development:

- Register the domain before announcing anything publicly. Check `.com` availability first, with `.id` or `.co.id` as market-appropriate alternatives.
- Verify the name is not already in use by a competing product or registered as a trademark in Indonesia.
- Note that a nearby name (`BuildPad`) was among the design references reviewed; confirm there is no confusing similarity in the same category before committing.
- `SITE_NAME` remains a constant, so the name is still cheap to change up until launch.

---

## ADR-0007 — 8 hours a week, the 2028 season, and the scope cuts that follow

**Date:** 2026-08 · **Status:** Accepted

**Context.** The owner has roughly **8 hours a week** and is the sole developer, sole designer, and sole operator. Phase 1 is approximately 320 hours of work; designing templates adds about 20 more. At 8 hours a week that is around 42 weeks — ten months.

Calendar sales in Indonesia are sharply seasonal: buyers purchase next year's calendar between October and December. Selling 2027 calendars would require launching by mid-October 2026, eight weeks from this decision. Even an aggressive cut — desk calendars only, three designs, no admin panel — lands in January 2027, after the buying window closes.

**Decision.** The 2027 season is out of reach and is not pursued. The target is the **2028 calendar season, October to December 2027**, with a soft launch in September 2027. Development runs September 2026 to August 2027.

Three scope consequences follow directly:

1. **Three templates at launch, not six.** Each good template is 5–7 hours of the owner's own design time. Three covers desk, A3 and A2. More are added once real usage shows which style people choose.
2. **Phase 2 is deferred past launch.** A full print checkout with address handling and shipping rates is roughly 120 hours. At launch volume, a prefilled WhatsApp message achieves the same outcome in about four (P1-US-105). Phase 2 gets built in the 2028 quiet season, and only if click data on the WhatsApp button justifies it.
3. **No corners cut on safeguards.** Because there is no deadline pressure, the coin ledger, the memory budget, and backups with a tested restore all stay in scope. These are the first things a rushed launch drops and the most expensive to retrofit.

**Consequences.** A calm year rather than a frantic quarter, and a soft launch that lands in a quiet month — the owner gets to be bad at operations while almost nobody is watching, then be good at it when the season arrives.

The real risk is no longer technical. It is **motivation across ten months of solo building with no customer feedback**, particularly months four through seven, which are the renderer: invisible plumbing with nothing to show. Two mitigations are treated as part of the plan, not as nice-to-haves:

- Something visible must finish every month, so progress stays legible to the person doing it.
- The five-user test in August 2027 is mandatory. It is the checkpoint solo builders skip and the one that best predicts whether anyone will buy.

Two parallel tracks start immediately because their lead times are outside the owner's control: **QRIS merchant registration** and **finding a print vendor** for the spike.

If available hours change materially, revisit this ADR — every date in it is derived from the 8-hour figure and nothing else.

---

## ADR-0008 — Skeleton choices that the specification left open

**Date:** 2026-08 · **Status:** Accepted

**Context.** P1-US-001 specifies the repository's shape but not every tool inside it. Building it surfaced six choices that had to be made one way or the other, each small enough to be invisible later and annoying to reverse.

**Decision.**

1. **pnpm workspaces, no Turborepo.** Four packages and a solo developer. Root scripts fan out with `pnpm -r`. Add a task runner when build times justify it, not before.
2. **Tailwind v4, tokens in CSS.** `packages/ui/src/theme.css` holds an `@theme` block copied value-for-value from `design/assets/ds.css`. v4 has no `tailwind.config.js`; the CSS *is* the config. Starting on v3 would mean migrating later for nothing.
3. **The auth bridge uses triggers, not a foreign key.** `public.profiles.id` does not carry an FK to `auth.users`. The auth schema is outside Prisma's datasource, so the constraint would read as schema drift on every `prisma migrate dev`. Two triggers on `auth.users` — insert and delete — give the same guarantee without Prisma trying to drop it. The trigger block is wrapped in a `to_regclass('auth.users') IS NULL` guard, because `prisma migrate dev` replays every migration against a shadow database that has no `auth` schema; unguarded, the migration fails with P3006 and `pnpm db:migrate` never runs at all.
4. **The skeleton schema is only what the seed needs.** Six tables: `profiles`, `coin_packages`, `product_presets`, `templates`, `holidays`, `settings`. The transactional tables from master spec §8 arrive with the stories that own them, each with RLS in the same migration.
5. **Only fixed-date holidays are seeded.** Ten rows across two years: Tahun Baru Masehi, Hari Buruh Internasional, Hari Lahir Pancasila, Hari Kemerdekaan Republik Indonesia, Hari Raya Natal. Every other Indonesian public holiday, and all *cuti bersama*, are set by an SKB decree published late in the preceding year. Guessing them would print wrong red dates on a calendar someone paid for. They are imported per year through the admin panel (P1-US-703).
6. **Seeded templates are inactive.** A template is a Design JSON in R2 (AR-02) and neither `calendar-core` nor those objects exist yet. The rows exist so the shape is real; the admin activates them once a design is uploaded.

**Consequences.** The repository runs from a clean checkout with four commands and no local database. Three things must stay true:

- RLS ships in the same migration as every new table. `pnpm check:rls` fails the build otherwise, and it is verified to catch both a missing `ENABLE ROW LEVEL SECURITY` and a missing deny-all policy.
- Holiday data is imported before each season, because the seed deliberately does not know it.
- Both apps read the **root** `.env` through `dotenv-cli`, and Docker Compose is always invoked with `--project-directory .`. Next.js otherwise reads `apps/web/.env` and Compose otherwise reads `infra/.env` — in both cases a missing file is silent, and the process falls back to defaults that look like they work. That failure mode cost real time during this story: the renderer connected to an unrelated Redis on the default port and reported itself healthy.

A measurement from the spike is also now load-bearing in production config: `MALLOC_ARENA_MAX=2` is set in both Dockerfiles. Without it a long-lived Node worker's RSS climbs with every job while the JS heap stays flat (`spike/REPORT.md` §3.1). On a 1 GB box that is the difference between a bounded worker and an OOM kill.

---

## ADR-0009 — `calendar-core` returns a serialised Fabric group, not a live one

**Date:** 2026-08 · **Status:** Accepted

**Context.** P1-US-002 requires two things that pull against each other: `renderCalendarGridToFabric(props, scale)` must "produce a Fabric group", and the package must have **zero DOM dependencies** so it runs identically in Node and the browser.

Fabric cannot satisfy both. Its default entry point is the browser build; its `./node` entry pulls in `canvas` and `jsdom`. Importing either inside `calendar-core` would mean the package no longer runs identically in both places — which is the whole point of AR-01.

**Decision.** `renderCalendarGridToFabric` returns Fabric's own **serialised** form — a plain object `{ type: 'Group', objects: [...] }` using Fabric v6 class names (`Group`, `Text`, `Line`, `Rect`, verified against fabric 6.7.1 source). Consumers enliven it:

```ts
const [group] = await util.enlivenObjects([renderCalendarGridToFabric(props, scale)]);
```

The package declares no dependencies and no peer dependencies at all. Its `tsconfig.json` omits the DOM lib, so a stray `document` fails typecheck rather than review, and a test asserts the source references no DOM global, imports nothing outside the package, and never reads `Intl` or `process.env`.

Child objects are positioned relative to the group's top-left, with `originX: 'left'` and `originY: 'top'` on every child.

**Consequences.** The editor and the renderer consume the identical JSON, so they cannot diverge — a stronger guarantee than sharing a function that constructs objects differently in each environment. The cost is one `enlivenObjects` call at each call site, and one thing that must be confirmed against real Fabric the first time the editor renders a grid (P1-US-401): that a group built from this JSON positions its children as intended. If Fabric's group-relative coordinate handling requires an adjustment, it is one function, and the tests pin everything else.

A second decision inside the same story: **`fonts.ts` lists exactly the fonts `infra/Dockerfile.renderer` installs today** — the DejaVu and Liberation families, six in total, each annotated with the Debian package that provides it. The interface faces from `design/assets/ds.css` (Archivo, Instrument Sans, IBM Plex Mono) are deliberately absent, because they are not in the image, and a font in the picker but not in the image renders as a silent substitution that a user discovers only in a printed PDF. Adding one is a Dockerfile change plus an image rebuild, and belongs to whichever story first authors a template that needs it.

---

## Template for new entries

Copy the block below verbatim when adding a decision. It is shown as raw markdown on purpose — so the heading and bold syntax stay visible and copyable rather than rendering as formatting.

```
## ADR-000N — <short title>

**Date:** YYYY-MM · **Status:** Proposed | Accepted | Superseded by ADR-000M

**Context.** What forced a decision. Include the constraint or measurement, not just the preference.

**Decision.** What was chosen, stated plainly.

**Consequences.** What this makes easy, what it makes hard, and what has to be true for it to keep working.
```
