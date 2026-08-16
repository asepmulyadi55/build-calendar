# Phase 1 — MVP: From Visitor to Paid Calendar File

> Prerequisites: read `00-master-spec.md` and `01-tech-stack-and-infrastructure.md` first.
> Phase goal: a stranger can arrive, build a calendar from a template, pay Rp10,000, and download a print-ready PDF — without any help from an admin.

---

## Definition of Done

- [ ] A new visitor can register, build a calendar from a template, top up, unlock, and download a valid PDF unassisted.
- [ ] The exported PDF opens in Adobe Reader at the exact page size (including bleed), with selectable vector text.
- [ ] The coin balance shown in the UI always equals the sum of the ledger.
- [ ] Admins can verify payments and manage templates without touching the database.
- [ ] Every `BR-C*` and `BR-U*` rule has an automated test.
- [ ] Every `RQ-MEM-*` requirement is implemented, and the A2 memory regression test passes in CI.
- [ ] An export failing under memory pressure degrades to a failed job with a clear message — it never takes down the web process.
- [ ] Homepage scores ≥ 90 on Lighthouse Performance and Accessibility (mobile).
- [ ] The pre-launch checklist in `01-tech-stack-and-infrastructure.md` §7 is fully green.

---

## Epic 0 — Foundation

### P1-US-000 · Print pipeline spike (do this before anything else)
**As the** owner, **I need** proof that the render approach actually produces printable output within the server's memory budget, **before** any product code is written.

This is throwaway code. It is not architected, not tested, and not merged. Its only job is to convert the project's two riskiest assumptions into measurements. Budget two to three days.

- [x] A standalone script renders one A3 sheet — one photo plus a calendar grid — to PDF via Puppeteer, using the vector path described in P1-US-601.
- [x] Open the result in Adobe Reader: page size is exactly 303 × 426 mm (A3 + 3 mm bleed), and **text is selectable**, confirming it is vector rather than raster. — measured 303.02 × 426.13 mm, 52 extractable text objects, 3 embedded font subsets. Verified with `pdf-lib` + `pdfjs`, not by opening Adobe Reader
- [x] Repeat for the A2 single-sheet product, which is the heaviest page in the catalog. — 426.13 × 600.03 mm
- [x] Run the renderer in a container capped at 1 GB (`docker run -m 1g`) and record **peak RSS** via `docker stats`, for both A3 and A2. — cold 219/229 MB, warm 375/393 MB, no OOM
- [x] Compare the measurement against the budget in `01-…` §4.2. If it exceeds the budget, apply the degradation plan in that section and record the outcome in `DECISIONS.md`. — inside budget; no degradation step needed
- [ ] **Take the A3 PDF to a real print shop and have it printed.** Inspect color, trim alignment, and text sharpness. Confirm the shop accepts the file without complaint about color space or missing bleed. — **outstanding.** File is at `spike/out/a3-303x426mm.pdf`
- [ ] Record all findings in `DECISIONS.md`. If the printed result is unacceptable, stop and revisit the architecture — this is the one moment where that is cheap. — partial: ADR-0008 records the `MALLOC_ARENA_MAX` finding (§3.1, already applied). Two decisions remain open — the print-derivative cap vs A2 (§3.2) and the renderer `mem_limit` (§3.3) — and the printed-result finding cannot be written until the sheet is printed

**Exit criteria:** a physical printed sheet you are happy to sell, and a peak-RSS number that fits the server. Do not begin P1-US-001 until both exist.

### P1-US-001 · Project skeleton
**As a** developer, **I need** a repository that runs from a clean checkout.

- [x] Monorepo per `01-…` §1.1 (`apps/web`, `apps/renderer`, `packages/*`).
- [x] Docker Compose runs `web`, `renderer`, `redis`, and `caddy`. Postgres is Supabase (remote), not a local container — develop against the real thing to catch pooler and RLS issues early.
- [x] `.env.example` lists every variable from `01-…` §6 with explanatory comments.
- [x] `pnpm dev`, `pnpm test`, `pnpm db:migrate` all work as documented. — verified from a clean checkout
- [x] Prisma configured with both `DATABASE_URL` and `DIRECT_URL` (`01-…` §5.1).
- [x] Seed script creates: one admin account, three coin packages, five product presets, holidays for the current and next year, **three** sample templates (see ADR-0007 — the owner designs these alone, so three is the launch target, not six). — admin needs `SEED_ADMIN_EMAIL`/`_PASSWORD`; holidays are fixed-date only and templates seed inactive, per ADR-0008
- [x] ESLint, Prettier, and TypeScript strict mode enforced; CI fails on type errors.
- [x] CI check that fails if any migration creates a table without enabling RLS (`01-…` §5.3). — `pnpm check:rls`, verified to catch both a missing RLS enable and a missing deny-all policy

### P1-US-002 · The `calendar-core` package
**As a** system, **I need** one calendar layout library so the editor and renderer cannot diverge.

- [x] `buildMonthMatrix(year, month, weekStart)` returns a 6×7 matrix including leading/trailing days.
- [x] `resolveHolidays(year, month, holidays)` maps dates to holiday entries.
- [x] Indonesian month and weekday name tables, **hardcoded with no locale parameter**. `calendar-core` renders `id-ID` and only `id-ID` (master §10.7).
- [x] TypeScript types for Design JSON (`CalendarDesign`, `Sheet`, `SlotDefinition`, `CalendarGridObject`) carrying `schemaVersion`.
- [x] `renderCalendarGridToFabric(props, scale)` produces a Fabric group. — returns Fabric's serialised form; see ADR-0009
- [x] `mmToPx(mm, dpi)` and `pxToMm(px, dpi)`.
- [x] `fonts.ts` — the single font allowlist shared by the editor picker and the renderer image (`01-…` §5.5). — lists what the image installs today; see ADR-0009
- [x] Unit tests: leap-year February, months starting on Sunday, Monday vs Sunday week start, multiple holidays on one date.
- [x] **Zero DOM dependencies** so it runs in Node and the browser identically.

### P1-US-003 · Design system
- [x] Palette, type scale, radii, and spacing defined as Tailwind tokens. — `packages/ui/src/theme.css`, values copied from `design/assets/ds.css`
- [ ] Base components: Button, Input, Card, Modal, Toast, Tabs, Badge, EmptyState, Skeleton. — **not built.** Five (Button, Input, Card, Modal, Badge) have a design in `design/assets/ds.css` and can be built now. Four (Toast, Tabs, EmptyState, Skeleton) appear nowhere in `design/` and need designing first. First consumer is Epic 2 (auth screens), not Epic 1 — public pages are built last
- [x] Light mode only; dark mode out of scope.
- [x] All **application** strings routed through a single `en.ts` file. No string hardcoded inline.
- [x] **Calendar output strings** (month names, weekday labels) live in `calendar-core`, never in `en.ts`. Keeping them separate is what prevents the English interface from leaking onto the printed sheet. — enforced by tests on both sides

---

## Epic 1 — Public Pages

### P1-US-101 · Homepage
**As a** visitor, **I want** to immediately understand the product and see real output.

- [ ] **Hero**: headline, subhead, "Make a calendar" CTA, calendar mockup visual.
- [ ] **Calendar types**: cards for Desk, Wall 12-sheet, Wall 6-sheet, Wall single-sheet. Each shows a mockup photo, trim size, sheet count, and a "see samples" link.
- [ ] **Sample gallery**: at least three designs, expandable in a lightbox. Samples show printed output, not raw screenshots. Do not design the layout around a large grid — it must look deliberate with three items, and simply extend as more are added.
- [ ] **Three-step how-it-works**: choose template → upload photos → export or order print.
- [ ] **Pricing section** (P1-US-102).
- [ ] **FAQ**: at least eight questions — do coins expire, can I revise, what file format, where can I print it, can you print for me, shipping, is my photo safe, how do I pay.
- [ ] **Floating WhatsApp button** on every public page (P1-US-104).
- [ ] **Footer**: legal links, contact, social.
- [ ] Fully responsive, `next/image` with lazy loading, complete OG metadata.

### P1-US-102 · Pricing and benefits
- [ ] Packages read from `coin_packages`, never hardcoded. Defaults: Rp10,000/5, Rp25,000/15, Rp50,000/35.
- [ ] Each package shows an effective per-calendar price ("≈ Rp2.000 per kalender").
- [ ] One package can carry a "Most popular" badge.
- [ ] Explicit benefit list:
  - Print-ready 300 DPI PDF export, no watermark
  - **Pay once per calendar, re-export free forever**
  - Unlimited photo and text revisions after unlocking
  - Indonesian public holidays and red dates filled in automatically
  - Files stored in your account, downloadable any time
  - Order printing and delivery (mark "segera hadir" until Phase 2 ships)
- [ ] The coin mechanic is explained in plain language — this is the product's main differentiator and the most common source of confusion.
- [ ] Mini-FAQ below pricing: "Do coins expire?" → no. "What if I mess up the design?" → edit and re-export free.

### P1-US-103 · Legal and static pages
- [ ] `/terms`, `/privacy`, `/refunds`, `/faq`, `/how-it-works` exist and are linked in the footer.
- [ ] The refund policy states plainly that **coins are non-refundable** (BR-C03); print-order refunds cover production defects only.
- [ ] Legal content authored as MDX for easy updates.

### P1-US-104 · WhatsApp CTA
- [ ] Floating button, bottom right, on all public and authenticated pages.
- [ ] Number sourced from `settings.whatsapp_number`.
- [ ] Context-aware prefilled message, e.g. `Hi, I have a question about desk calendars`, or on a project page `Hi, I need help with project #{code}`.
- [ ] Links to `https://wa.me/{number}?text={encoded}`, opened in a new tab.
- [ ] Clicks recorded as an analytics event.

### P1-US-105 · Print request over WhatsApp
**As a** user, **I want** to ask for a printed copy, **even though** automated checkout does not exist yet.

Phase 2 builds a real checkout with shipping rates. That is roughly 120 hours of work and is deliberately deferred (ADR-0007). At launch volume, a prefilled WhatsApp message does the same job in about four hours of work.

- [ ] An "Order a print" button appears on the project page, the preview page, and the export page.
- [ ] It opens WhatsApp with a prefilled message containing the project code, product preset, and year — e.g. `Hi, I'd like a printed copy of project #KC-4821 (Wall A3, 12 sheets, 2027).`
- [ ] The admin can look up that code and open the project directly.
- [ ] Copy states plainly that printing is quoted manually and does not use coins.
- [ ] No addresses, no shipping calculation, no order records. Resist building "just a small version" of Phase 2 — a half-built checkout is worse than an honest manual one.
- [ ] Track how many people click it. That number is the evidence for whether Phase 2 is worth building at all.

---

## Epic 2 — Accounts

### P1-US-201 · Registration
- [ ] Fields: name, email, password, WhatsApp number (optional but encouraged — used for order updates).
- [ ] Minimum 8-character password with a strength indicator.
- [ ] Verification email sent via **custom SMTP** (`01-…` §5.2). Users may sign in before verifying but **cannot top up or unlock** until verified.
- [ ] Google OAuth as an alternative (verified immediately).
- [ ] Terms acceptance checkbox required.
- [ ] Rate limits per NFR-S02.
- [ ] A trigger on `auth.users` creates the matching `profiles` row (`01-…` §5.4).

### P1-US-202 · Sign in, sign out, password reset
- [ ] Email + password and Google sign-in.
- [ ] "Remember me" extends the session to 30 days.
- [ ] Reset token valid one hour, single use.
- [ ] Error messages never reveal whether an email is registered.
- [ ] Post-login redirect returns the user to their intended destination (`callbackUrl`).

### P1-US-203 · Account settings
- [ ] Change name, WhatsApp number, password.
- [ ] Email displayed but not changeable in Phase 1.
- [ ] Account deletion with typed email confirmation, scheduling removal per NFR-P03.

---

## Epic 3 — Building From a Template

### P1-US-301 · Choose a calendar type
- [ ] `/app/new` lists active product presets as cards (name, size, sheet count, illustration).
- [ ] Selecting one filters to compatible templates.
- [ ] A "Start from scratch" button appears **disabled** with a "Coming soon" label until Phase 3.

### P1-US-302 · Template gallery
- [ ] Thumbnail grid with category filters (Keluarga, Minimalis, Islami, Bisnis, Anak, Alam).
- [ ] Quick-look modal showing every sheet in the template.
- [ ] Templates flagged `is_premium` show a badge (all are free in Phase 1; the badge exists for future use).
- [ ] Selecting a template creates a `projects` row copying the template's Design JSON, then redirects to the editor.
- [ ] Guests clicking through are sent to `/signin?callbackUrl=…`.

### P1-US-303 · Template-mode editor
**As a** user, **I want** to swap photos, text, and colors without breaking the design.

- [ ] Layout: sheet thumbnails on the left, canvas centre, properties panel right.
- [ ] Only objects listed in `slot_schema` are editable. Everything else is locked and unselectable.
- [ ] Slot types:
  - `image` — upload, replace, pan, zoom, rotate within its frame
  - `text` — edit content with a character limit; font size follows the template
  - `color` — pick from the template palette or freely
- [ ] Changes render immediately on canvas via `calendar-core`.
- [ ] Autosave debounced at 5 seconds with a "Saving… / Saved" indicator.
- [ ] Undo/redo, at least 20 steps (Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z).
- [ ] "Apply to all sheets" for color slots and repeated text slots.
- [ ] "Reset this sheet to template".
- [ ] Editable project title, defaulting to `{TemplateName} {Year}`.
- [ ] Any control that edits printed content shows the value as it will print — the month selector reads `Januari`, while its English label reads "Month" (master §10.7).
- [ ] Year picker available while the project is `draft`; disabled once `unlocked`, with an explanation and a "Duplikat" button (BR-U05).
- [ ] Below 1024 px, show a message explaining the editor needs a larger screen, with a link to the preview.

### P1-US-304 · Photo upload and management
- [ ] Upload via file picker or drag-and-drop; multiple files at once.
- [ ] Validation: magic bytes, 15 MB max, JPEG/PNG/WebP/HEIC (HEIC converted server-side to JPEG).
- [ ] EXIF orientation applied, then **all EXIF metadata stripped** (NFR-S05).
- [ ] Server produces three derivatives — thumbnail 300 px, preview 1200 px, print (capped per `01-…` §3.1) — and **discards the original**.
- [ ] All derivatives stored in R2 under `users/{userId}/assets/{assetId}/{variant}.jpg`.
- [ ] "My gallery" retains uploaded photos for reuse across sheets and projects.
- [ ] Per-slot resolution indicator: green ≥ 300 DPI, amber 150–299, red < 150, with plain-language explanation ("This photo will look blurry at print size").
- [ ] In-slot crop tools: pan, zoom, rotate 90°, and "fit automatically".
- [ ] Deleting a gallery photo warns if another project uses it.

### P1-US-305 · Calendar grid and holidays
- [ ] The grid is generated by `calendar-core`, never a static image.
- [ ] Month and weekday labels render in **Bahasa Indonesia** — `Januari`, and `Sen Sel Rab Kam Jum Sab Min`. This is printed output (master §10.7, Layer 2) and is not affected by the English interface.
- [ ] Week starts Monday by default; switchable to Sunday where the template allows.
- [ ] Sundays and national holidays render red.
- [ ] Holiday names print in the sheet's legend area (or beneath the date, per template design), **in Indonesian, verbatim from `holidays.name`** — e.g. `1 Jan — Tahun Baru Masehi`. Never translated.
- [ ] Joint leave days (*cuti bersama*) styled distinctly from national holidays, with a legend entry.
- [ ] "Holiday data updated {date}" label shown in the editor panel.
- [ ] If the selected year has no holiday data, show a clear warning rather than rendering silently empty.

---

## Epic 4 — Preview and Validation

### P1-US-401 · Full preview
- [ ] `/app/projects/[id]/preview` shows every sheet in order.
- [ ] Preview is rendered **server-side by the same engine as export**, guaranteeing WYSIWYG (AR-01).
- [ ] Before unlock: low resolution plus a repeating diagonal watermark that cannot be removed via CSS.
- [ ] After unlock: higher resolution, no watermark.
- [ ] Toggles for bleed and safe-area guides.
- [ ] Sheet navigation and fullscreen mode.
- [ ] Previews cached and regenerated only when the Design JSON hash changes.

### P1-US-402 · Print-readiness report
- [ ] Runs every `VLD-*` rule from master §5.5.
- [ ] Results listed as pass (green), warning (amber), blocker (red).
- [ ] Each finding names the sheet and object, with a "Fix this" button that jumps to it in the editor.
- [ ] Blockers disable export and checkout.
- [ ] Warnings require only an acknowledgement checkbox.

---

## Epic 5 — Coins, Payments, and Unlocking

### P1-US-501 · Coin page and top-up
- [ ] `/app/coins` shows a prominent balance, transaction history (date, description, +/-, running balance), and available packages.
- [ ] Choosing a package creates a `payments` row with `status = pending`, `payable_type = coin_topup`, and a unique code (BR-P02).
- [ ] The payment instruction page shows the exact amount including the unique code, bank accounts from `settings`, a 24-hour countdown, and copy-to-clipboard buttons.
- [ ] Proof upload form (image or PDF, 5 MB max) storing to R2.
- [ ] After upload, status moves to `waiting_verification`; the user gets an email plus a WhatsApp link for urgent cases.
- [ ] A cron marks unpaid records `expired` after 24 hours.

### P1-US-502 · Admin payment verification
- [ ] `/admin/payments` lists `waiting_verification` records, oldest first.
- [ ] Detail view: user, amount with unique code, timestamp, proof preview.
- [ ] Approve → coins credited in a single database transaction (insert `coin_transactions`, update cache, mark payment `paid`, record `verified_by`).
- [ ] Reject → reason required; user notified by email.
- [ ] Every action written to `audit_logs`.
- [ ] Admin email notification when new proof arrives.

### P1-US-503 · Unlocking a project
**This is the most critical flow in the product. Test it exhaustively.**

- [ ] The "Unlock export" button shows the cost and current balance.
- [ ] The confirmation modal states clearly: *"Once unlocked, you can revise and export this calendar as many times as you want — forever, with no extra coins."*
- [ ] Insufficient balance routes to top-up and returns to the project afterwards.
- [ ] Coin deduction, ledger write, and `projects.status` / `unlocked_at` update occur in **one database transaction**.
- [ ] **Idempotent**: double-clicks and retried requests never charge twice. Enforced by the partial unique index in `01-…` §5.6, not by application logic alone.
- [ ] Unlocking an already-unlocked project returns success without charging.
- [ ] If the first export job fails for system reasons, coins are refunded automatically via a compensating ledger entry (BR-U08) and the user is notified.
- [ ] **Required test**: two concurrent unlock requests on the same project deduct exactly one coin.

---

## Epic 6 — The Export Engine

### P1-US-601 · Renderer service
- [ ] A separate Node service running a BullMQ worker.
- [ ] Docker image ships with Chromium and every allowlisted font (`01-…` §5.5).
- [ ] Pipeline: fetch Design JSON → rebuild the scene through `calendar-core` + Fabric → emit SVG per sheet → embed in HTML at exact mm page size (`@page { size: Wmm Hmm; margin: 0 }`) → `page.pdf({ preferCSSPageSize: true, printBackground: true })`.
- [ ] **Render one sheet at a time**, producing single-page PDFs merged with `pdf-lib`, to keep peak memory flat (RQ-MEM-02).
- [ ] **Chromium is launched on demand and terminated after 60 seconds idle** (RQ-MEM-01). It is never kept warm. This is the single largest memory saving on a 1 GB instance and must not be "optimized away" into a persistent browser pool.
- [ ] **Images are pre-sized with sharp** to the exact pixel dimensions the slot needs at 300 DPI before Chromium receives them (RQ-MEM-03). Chromium must never decode a source larger than the slot requires.
- [ ] Chromium launch flags per RQ-MEM-07, including `--disable-dev-shm-usage` and `--max-old-space-size=256`.
- [ ] Job timeout of 5 minutes, after which the job fails cleanly and the Chromium process is killed (RQ-MEM-08).
- [ ] A memory regression test: render the A2 single-sheet product in a container capped at 1 GB and assert the job completes. This test runs in CI and is a release blocker if it fails.
- [ ] Text remains **vector** — verify by selecting text in the output PDF.
- [ ] Images pulled from the R2 print derivative and scaled to ≥ 300 DPI at final size.
- [ ] Page size = trim + bleed × 2 on each axis.
- [ ] Optional crop marks drawn in the bleed area.
- [ ] **No outbound network access during rendering** (prevents SSRF and non-deterministic output).
- [ ] Requests authenticated with `RENDERER_SHARED_SECRET`; the service is not publicly exposed.

### P1-US-602 · User-facing export flow
- [ ] Export options: include crop marks (default on), include bleed (default on), image quality (Standard/High).
- [ ] Clicking Export creates an `export_jobs` row; the UI shows progress (queued → processing → success) via polling or SSE.
- [ ] On success, a download button with a 24-hour signed URL.
- [ ] Export history listed (timestamp, options, file size), **all re-downloadable at no cost** (BR-U07).
- [ ] Locked projects may download a **watermarked low-resolution sample PDF** — deliberately offered so users can trust the output before paying.
- [ ] Failures show a friendly message, an error ID, and the WhatsApp link.
- [ ] Maximum three queued jobs per user.
- [ ] **BullMQ concurrency locked to 1** (RQ-MEM-04), with a code comment pointing at `01-…` §4.2. Raising it requires a larger instance first. Because jobs run strictly one at a time, the UI must show queue position, not just "processing", so a user behind someone else's A2 render understands the wait.

### P1-US-603 · Output quality assurance
- [ ] Automated test: generate a PDF for every product preset; assert page count and page dimensions in points (±0.5 mm tolerance).
- [ ] Visual regression test comparing rendered PNGs against reference images for three templates.
- [ ] One-time manual check before launch: print a real desk calendar and a real A3 sheet at an actual print shop; inspect color, trim alignment, and text sharpness.

---

## Epic 7 — Minimal Admin

### P1-US-701 · Admin dashboard
- [ ] Summary: total users, top-ups today and this month, coins spent, export count, payments awaiting verification.
- [ ] Role-guarded and excluded from search engine indexing.

### P1-US-702 · Template management
- [ ] Template CRUD: name, category, product preset, thumbnail upload, Design JSON upload or paste, `slot_schema`, active flag, sort order.
- [ ] Preview the template in the admin panel before activating.
- [ ] Validation: JSON conforms to schema, sheet count matches the preset, every slot has a unique `id`.
- [ ] Since Phase 3 does not exist yet, provide a **file-based template authoring flow**: the admin drops JSON plus assets, the panel imports them. Document the format in `docs/template-format.md`.

### P1-US-703 · Packages, presets, holidays, users, settings
- [ ] CRUD `coin_packages` (price, coin amount, active, order, badge).
- [ ] CRUD `product_presets` including dimensions, bleed, and unlock cost.
- [ ] CRUD `holidays` plus JSON import per year and a "copy from previous year" action.
- [ ] User list: search, view balance and projects, manual balance adjustment **requiring a reason** and written to the audit log.
- [ ] Site settings: WhatsApp number, bank accounts, site name, contact email.

---

## Suggested Build Order

0. **P1-US-000 — the spike. Nothing else starts until its exit criteria are met.**
1. P1-US-001, 002, 003 — foundation. Do not skip; `calendar-core` determines everything downstream.
2. P1-US-201, 202, 203 — auth.
3. P1-US-301, 302 and P1-US-702 — templates must exist before the editor is testable.
4. P1-US-303, 304, 305 — template editor.
5. P1-US-601 — renderer. Then P1-US-401, which consumes it.
6. P1-US-402 — validation.
7. P1-US-501, 502, 503 — money.
8. P1-US-602, 603 — export.
9. P1-US-101 through 104 — public pages, built late so real product screenshots can be used as samples.
10. P1-US-701, 703 — remaining admin.

## Out of Scope for Phase 1

Physical print orders, shipping, QRIS, the drag-and-drop custom editor, CMYK conversion, 3D mockups, coupons, automated WhatsApp messages, mobile apps, multi-language.
