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

## ADR-0008 — Modular monolith, not microservices

**Date:** 2026-08 · **Status:** Accepted

**Context.** The question was raised whether the web application should call a separate backend API service rather than reaching the database through its own server code, and whether the system should be split into microservices even though there is a single database.

Two things were conflated and are worth separating. The browser never talks to Supabase directly — every request already goes `browser → Next.js route handler → Prisma → Supabase`, with the service-role key held only on the server. An API layer therefore already exists; it simply ships in the same deployable as the frontend.

**Decision.** Stay with a **modular monolith plus one specialised worker**. Two processes:

1. `apps/web` — Next.js, serving pages and route handlers, holding all business logic
2. `apps/renderer` — Node, Puppeteer and BullMQ

No further service splitting during Phases 1 to 3.

**Rationale.**

*Memory settles it.* Production is a 1 GB instance (ADR-0002), already at roughly 600 MB idle. A third Node process costs another 200–300 MB. There is no room. This is arithmetic, not architectural preference.

*Microservices solve an organisational problem.* Their primary benefit is letting independent teams deploy independently. There is one person here, so there is no coordination cost to remove — only coordination cost to add.

*The coin ledger needs real transactions.* Splitting payments into its own service forces a choice between distributed transactions with sagas and compensating actions — complex, error-prone, and holding customer money — or a separate database per service. Sharing one database across services instead produces a distributed monolith: the operational cost of microservices with none of the isolation.

*Schedule.* At 8 hours a week (ADR-0007), separate deployments, logs, service contracts and cross-process debugging would plausibly add two to three months to Phase 1.

**The one split that is justified.** The renderer is already a separate process, and deliberately so: Chromium has fundamentally different resource behaviour — memory spikes, long-running jobs — and a failed render must never be able to take down the web process. That is a genuine fault line, not a fashionable one.

**Consequences.** To keep the monolith split-ready without paying for a split now:

- Business logic lives in modules (`src/server/modules/*` or `packages/*`), never inside route handlers.
- Route handlers stay thin: parse, authorise, call a module function, format the response.
- React components and pages never call Prisma directly. Always through a module function.
- Module boundaries follow the business rules — coins, projects, exports, holidays — so a future extraction is a move, not a rewrite.

Route handlers are ordinary HTTP endpoints, so a future mobile app or third-party client can call them without any new service.

Revisit only when a concrete trigger appears: sustained CPU or memory contention that a larger instance cannot absorb, a second engineer whose work is blocked by shared deployment, or a component with genuinely different scaling behaviour. Absent one of those, splitting further would cost throughput and buy nothing.

---

## ADR-0009 — Judgement calls made building the public pages

**Date:** 2026-08 · **Status:** Accepted

**Context.** Epic 1 translated `design/index.html`, `samples.html` and `pricing.html` into the app. Six places needed a decision the prototype did not answer, mostly because the prototype had fixed content where the real page reads a database.

**Decision.**

1. **`ds.css` is copied into `packages/ui/src/components.css`, not reimplemented as Tailwind utilities.** The design is finished and the job is translation; rewriting 700 lines of working CSS as utility classes would create drift with no benefit. The copy carries a header naming its source, is excluded from Prettier so the two stay diffable, and omits the app-shell, editor and checklist sections so a marketing page does not ship the editor's CSS. Tokens still live in `theme.css`, and `components.css` reaches them through alias variables — one value per token, two spellings.

2. **Public pages revalidate every 60 seconds rather than being fully static.** Coin packages, product presets and the WhatsApp number are all admin-editable. A fully static page would bake in whatever the database said at build time, so an admin edit would need a redeploy to appear — the same failure as hardcoding, one step removed.

3. **Copy containing a figure keeps its wording and takes a slot.** The coin explainer's "That works out to about Rp2.000" is the prototype's sentence, and the number is filled from the cheapest active package divided by the unlock cost. The wording was chosen deliberately and is left alone; the figure must never be a literal (BR-C01, BR-C04).

4. **Two copy lines were changed because data made them false.** The prototype's "Four formats" and "One for your desk, three for your wall" assume exactly four products; the seed ships five and an admin may add more. The eyebrow became "{count} formats" and the heading "One for your desk, the rest for your wall." The `.types` grid also had to stop painting its own background, because the 1px-gap hairline trick leaves a grey block when the card count does not fill the row — the hairline now comes from a ring on each card and survives any count.

5. **The type card is a `div` with two links, not one big anchor.** P1-US-101 requires a "see samples" link on each card, and an anchor cannot legally contain another anchor.

6. **Analytics events are logged, not stored.** P1-US-104 requires WhatsApp clicks to be recorded and P1-US-105 will use the count to decide whether Phase 2 is worth building. No provider is chosen yet, so `/api/events` accepts a fixed set of event names and writes a structured log line with no personal data. An unbounded events table on a 500 MB database is a slow leak, and the number is only ever read in aggregate.

**Consequences.** The pages contain no price, coin amount, phone number, or hex colour — asserted by tests that scan the source rather than the rendered output, because the rule is about what must not be written down. Two things follow: `components.css` must be re-diffed against `ds.css` whenever the design changes, and the 60-second revalidation is the upper bound on how long an admin waits to see a price change.

One consequence is worth stating separately: the hero's calendar mockup renders through `calendar-core`, not hardcoded Indonesian strings. It is a picture of printed output, so it belongs to the Indonesian layer (master §10.7), and routing it through the one engine is what stops the marketing page and the exported PDF from disagreeing about what January looks like.

---

## ADR-0010 — Judgement calls made building accounts

**Date:** 2026-08 · **Status:** Accepted

**Context.** Epic 2 wired Supabase Auth into the app. Five decisions were not settled by the stories, and two of them are security-relevant enough to be worth writing down rather than discovering later in a diff.

**Decision.**

1. **Rate limiting is in-process, not in Redis.** NFR-S02 wants login 5/min/IP and signup 3/hour/IP. Production is a single web container on one Lightsail box (ADR-0002), so one process sees every request and a `Map` is sufficient and free. This becomes wrong the moment a second web instance exists — at that point it moves to Redis, which is already running for the queue. The counters also reset on deploy, which is acceptable for a limit measured in minutes. The limiter is behind an interface and covered by ten tests, so swapping the store is a one-file change.

2. **"Remember me" is implemented as a cookie lifetime, not a session length.** Supabase has no per-sign-in session duration, so the choice is recorded in an `httpOnly` cookie and the auth cookies are written with a 30-day `maxAge` when it is set, and as session cookies when it is not. Session cookies are the default because a lot of Indonesian users share or borrow devices, and "stays signed in on the family laptop" is a worse failure than "has to sign in again".

3. **Account deletion is a soft delete.** `profiles.deletedAt` is set, every session is revoked through the admin API, and the row survives. Hard-deleting `auth.users` would cascade the profile away and orphan the ledger entries that NFR-P03 requires be *retained in anonymised form*. Sign-in checks the flag, because a closed account can still hold a valid token until it expires.

4. **Re-authentication is required to change a password.** Not asked for by P1-US-203, and added anyway: without it, anyone who finds an unlocked laptop takes the account and the coin balance with it. The cost is one extra field.

5. **Wrong password and unknown email return one identical string.** This is user enumeration, and it matters more here than on most sites: accounts hold paid balances, so confirming an address tells an attacker exactly where password stuffing is worth the effort. A repeat signup gets the same "check your email" as a new one, which is why Supabase returns an obfuscated user for that case. Seven tests assert the messages are indistinguishable; splitting them apart to be "more helpful" would undo the whole thing.

**Consequences.** The verification gate — `requireVerifiedUser`, `canTopUp`, `canSpendCoins` — exists and is tested but has no call site yet, because nothing spends coins until Epic 5. That epic must call it in the top-up and unlock paths; the predicates fail closed, so forgetting to call them is the only way to get it wrong.

Two things also remain outside the codebase and cannot be closed from here: custom SMTP and the Google provider are both configured in the Supabase dashboard. Until SMTP is set there, Supabase falls back to its built-in mailer, which is rate-limited to a handful of messages an hour and stops silently — §5.2's exact warning, and the failure that looks like a bug in our own code.

**A bug worth recording.** Tailwind ships a `.grid { display: grid }` utility. `ds.css` styles the calendar as `table.grid` and never set a `display`, so the utility won and turned the table into a grid container, collapsing all seven day columns into one. It shipped in Epic 1 and was only caught by looking at a screenshot. `components.css` now sets `display: table` explicitly, and a test fails the build if any selector whose class collides with a Tailwind display utility omits its own `display`.

---

## ADR-0011 — Template authoring is a file plus an importer

**Date:** 2026-08 · **Status:** Accepted

**Context.** Phase 3 gives templates a visual editor. Until then someone has to author them, and P1-US-702 asks for a file-based flow. Three decisions were open.

**Decision.**

1. **The validator lives in `calendar-core` and returns codes, not sentences.** It owns the Design JSON schema, and the renderer will need the same checks before it spends five minutes on a broken template. Returning `{ code, path, params }` keeps the package free of interface copy (master §10.7); `en.ts` turns each code into a sentence. Every problem is collected rather than throwing on the first, because fixing a twelve-sheet template one error per attempt is a bad afternoon.

2. **The preview is a schematic, not a render.** Sheets are drawn to scale in millimetres with slots and grid outlined. Rendering properly would mean a second engine, and AR-01 allows only one. What an admin needs before activating is "is the layout coherent" — are the slots where the designer meant, is anything outside the safe area — and an outline answers that. The real render arrives with P1-US-601.

3. **Files are written to R2 before the row is created, and the row lands inactive.** An orphan object costs a fraction of a cent; a row pointing at a missing object is a template that looks importable and breaks later. Inactive-by-default is what makes the preview step meaningful — the only way to activate is the template page, after looking at it.

**Consequences.** `packages/db/templates/` holds the three launch designs as versioned files, regenerated with `pnpm --filter @buildcalendar/db templates`. `pnpm db:seed` validates each against its preset, so a broken launch template fails the seed rather than the first customer, and stores the derived `slot_schema` — which therefore cannot drift from the design.

Two things follow that are worth stating. Seeded rows carry a `design_key` pointing at an object that does not exist until an admin imports the file through the panel; they stay inactive until then, so nothing broken can reach the gallery. And thumbnails are served through an admin route rather than a public URL, because the same bucket holds customer photos and R2 public access is per-bucket, not per-prefix (NFR-S04).

The format is documented in `docs/template-format.md`.

## ADR-0012 — Judgement calls made building the editor, uploads and the grid

**Date:** 2026-08 · **Status:** Accepted

**Context.** P1-US-303 to P1-US-305 left five things open, and two of them affect what a customer receives.

**Decision.**

1. **The Duplicate button reads "Duplicate", not "Duplikat".** P1-US-303 quotes the label as `"Duplikat"`, but the language rule in master §10.7 is unambiguous: interface copy is English, and only what is printed on a sheet is Indonesian. A button is interface. The story text is read as a leftover from the Indonesian-first draft. `en.test.ts` now fails on a short list of Indonesian interface words, because the month-and-weekday guard did not catch this one and would not catch the next.

2. **Joint leave is distinguished by shape, not colour.** *Cuti bersama* are non-working days and stay red, so colour cannot carry the distinction. The marker is a hollow ring where a national holiday is a solid dot, and the legend repeats the ring. Shape survives a monochrome print and is legible to a colour-blind reader; colour alone is neither.

3. **A photo's derivatives are written to R2 before its row is created, and the row stores keys only.** Same reasoning as ADR-0011: an orphan object costs a fraction of a cent, a row pointing at nothing is a broken slot the user cannot fix. If any of the three writes fails, all three are deleted and no row is created.

4. **Uploads are processed one file at a time, not in parallel.** `sharp` decodes the full image into memory, and a 15 MB HEIC from a modern phone is a large buffer. Several in flight together is the shape of an out-of-memory on a 1 GB box (RQ-MEM-*), and the user-visible cost is a progress counter instead of a spinner.

5. **The week start is a per-design property that a template opts into.** `slot_schema.allowWeekStart` defaults to absent, meaning no. A grid is drawn for one arrangement and most templates assume Monday; switching every sheet at once — never one month — is the only safe form of the control.

**Consequences.** The resolution indicator divides the stored print-derivative width by the slot's printed width in millimetres, so zooming in lowers the reported DPI, which is correct: zoom spends pixels. `ProjectAsset` rows are soft-deleted and their objects removed, so a project still referencing a deleted photo shows an empty slot rather than a broken image — which is what the deletion warning tells the user will happen.

One thing is deliberately unfinished. The crop values (`panX`, `panY`, `zoom`, `rotation`) are stored and previewed with a CSS transform, but the renderer does not yet consume them. Until it does, editor-to-export parity for cropping is unproven, and AR-01 makes that a blocker the moment P1-US-401 renders a slot. The fitting maths has to be written once, in `calendar-core`, and used by both.

## ADR-0013 — Judgement calls made building the renderer

**Date:** 2026-08 · **Status:** Accepted

**Context.** P1-US-601 turned the spike into a service. The spike answered the two questions it was asked — the vector path is print-ready, and A2 fits in 1 GB — and left three decisions open (`spike/REPORT.md` §3). Building the real thing forced three more.

**Decision.**

1. **`mem_limit` for the renderer is raised from 500m to 600m** (spike §3.3, RQ-MEM-06). Warm A2 peaks at 393–430 MB of non-cache memory. It fits under 500m, but with no room for a heavier template — more text objects, a second image — and a container that hits its own limit fails a job rather than degrading. The 100 MB comes out of headroom the 2 GB swap file (RQ-MEM-05) already exists to cover.

2. **The renderer holds no database connection.** Everything a job needs — sheets, holidays, image keys, options — arrives in the BullMQ payload, and the only I/O is R2 plus Redis. A render can take five minutes, and a five-minute render pinning a Postgres connection on a 1 GB box is a cost with no benefit. It also keeps the service's idle footprint to the worker itself.

3. **Photos are fetched, and the PDF written, outside the render.** "No outbound network access during rendering" is enforced at the page: every request that is not `file:`, `data:` or `about:` is aborted. Design JSON is user data, so without that guard an `<image href="http://169.254.169.254/…">` turns the renderer into an SSRF proxy inside the production network. The memory regression test goes further and runs the container with `--network none`, which is why the fixture generates its own photo rather than downloading one.

4. **The SVG emitter lives in `calendar-core`, not in the renderer.** AR-01 allows one engine. The renderer owns page geometry, Chromium and merging; the scene itself is built from the same objects the editor draws.

5. **A font outside `FONT_ALLOWLIST` fails the job rather than rendering.** Chromium substitutes a missing font silently, and the defect only appears on paper. This was not theoretical: rendering the A2 fixture on the development machine, where DejaVu is not installed, embedded Times New Roman instead — the PDF looked fine and was wrong. The memory regression test now asserts that every embedded font is one the image installs.

6. **`calendar-core`'s internal imports carry explicit `.js` extensions.** The package ships raw TypeScript so the editor and the renderer read the same source, but the renderer compiles that source and runs it under Node, where ESM requires the extension. TypeScript and Vitest resolve `.js` back to `.ts`; webpack does not, so `next.config.ts` sets `resolve.extensionAlias`. The alternative — publishing a built `calendar-core` — introduces a build ordering step and the possibility of a stale artefact drifting from the source both halves are meant to share.

**Consequences.** The renderer's compiled entrypoint is `dist/apps/renderer/src/index.js` rather than `dist/index.js`, because its `rootDir` spans the workspace in order to compile `calendar-core` alongside it. Every renderer import of that package goes through `src/calendar-core.ts`, a one-line re-export, because a bare specifier survives emit unchanged and would send Node back to the raw TypeScript at runtime.

Detecting vector text by scanning the PDF content stream for `Tj` does not work — Chromium writes those streams FlateDecode-compressed, so a correct vector PDF scans as empty. The reliable signal is the page's font resources: a rasterised page has none, and every embedded subset carries a six-letter tag. That is what the harness reports.

The spike's remaining open item is unchanged: nobody has printed one of these. That is the other half of P1-US-000's exit criteria and it is still owed.

## Template for new entries

Copy the block below verbatim when adding a decision. It is shown as raw markdown on purpose — so the heading and bold syntax stay visible and copyable rather than rendering as formatting.

```
## ADR-000N — <short title>

**Date:** YYYY-MM · **Status:** Proposed | Accepted | Superseded by ADR-000M

**Context.** What forced a decision. Include the constraint or measurement, not just the preference.

**Decision.** What was chosen, stated plainly.

**Consequences.** What this makes easy, what it makes hard, and what has to be true for it to keep working.
```
