# Master Specification — Print-Ready Calendar Generator

> This is the **single source of truth** for the project.
> Phase documents (`02-` through `05-`) describe execution. Where they conflict with this document, this document wins.
> Version 1.2 · Interface language: English · Target market: Indonesia · Spec language: English

---

## 1. Product Summary

A web application that lets anyone create a personal print-ready calendar (family photos, business photos, custom design), preview it, and then either:

- **Export it themselves** as a print-ready PDF (unlocked with coins), or
- **Order a physical print** that we produce and ship.

Core differentiators:

1. Very low unlock price (effectively Rp2,000 per calendar).
2. **Unlock once, export forever** — the user never fears "wasting" a coin on a revision.
3. Genuinely print-ready output (300 DPI, bleed, crop marks), not a screenshot JPG.
4. Indonesian public holidays and red dates filled in automatically.

## 2. Goals & Success Metrics

| Goal | Metric | Target (3 months post-launch) |
|---|---|---|
| Users try the product | Registration → first project created | ≥ 60% |
| Monetization works | Completed project → coin top-up | ≥ 15% |
| Output quality | Print complaints | < 3% of orders |
| Trust | Print orders completed (paid → delivered) | ≥ 95% |
| Performance | Export render time (12-sheet A3) | < 45s at p95 |

## 3. Actors & Roles

| Actor | Description | Access |
|---|---|---|
| **Guest** | Not signed in | Homepage, samples, pricing; may try a demo editor without saving |
| **User** | Registered and signed in | Create/save projects, upload photos, preview, top up coins, unlock exports, order prints, view history |
| **Admin** | Operator | Manage templates, verify manual payments, manage orders and tracking numbers, manage holidays, manage coin packages, site settings |
| **Superadmin** | Owner | All admin rights + manage admin accounts + view audit log |

## 4. Glossary

| Term | Meaning |
|---|---|
| **Project** | One calendar design owned by a user. Has one product type, one year, and N sheets. |
| **Sheet** | One physical printed page. A desk calendar has 13 sheets (cover + 12 months). |
| **Slot** | An editable region in a template (image / text / color). Everything outside slots is locked. |
| **Design JSON** | The scene-graph representation of a design (Fabric.js). Single source of truth for both preview and export. |
| **Unlock** | The state of a project after coins are spent; enables full-resolution, watermark-free export, permanently. |
| **Coin** | Prepaid credit. Used only to unlock projects. |
| **Print product** | A sellable combination of calendar type + size + paper + finishing. |

---

## 5. Core Business Rules

### 5.1 Coins

- **BR-C01** — Coins are purchased in packages. Default package: **Rp10,000 = 5 coins**. Other packages (e.g. Rp25,000 = 15, Rp50,000 = 35) are admin-configurable, never hardcoded.
- **BR-C02** — Coins **never expire**.
- **BR-C03** — Coins are **non-refundable** and non-transferable between accounts. This must be stated in the Terms before purchase.
- **BR-C04** — Default unlock cost: **1 coin per project**, same for every calendar type. The value lives in product configuration and is changeable without redeployment.
- **BR-C05** — Balance is derived from an **append-only ledger** (`coin_transactions`). Any balance column on the user row is a cache only, with a daily reconciliation job.
- **BR-C06** — Every balance change carries a `reason` and a `reference_id` (payment / project / admin adjustment).
- **BR-C07** — Coins are **not** spent when a user orders a physical print. A paid print order unlocks the project for free (see BR-O05).

### 5.2 Unlock & Export

- **BR-U01** — Before unlock: unlimited previews, but low resolution (max 1000 px on the long edge) and **watermarked**.
- **BR-U02** — Unlocking spends coins **once** and is **permanent for that project**.
- **BR-U03** — After unlock, the user may **edit and re-export without limit, forever, at no cost**.
- **BR-U04** — **Duplicating a project creates a new, locked project** that requires coins again. This is the only leak-stopper preventing one coin from becoming unlimited calendars.
- **BR-U05** — Changing the **calendar year** or **product type** on an unlocked project is **not permitted**. The UI must offer "Duplicate to a new project" (which costs coins). Rationale: one coin must not cover next year's calendar too.
- **BR-U06** — All other changes (photos, text, colors, layout, sheet order) are free and unlimited.
- **BR-U07** — Export files are retained and re-downloadable at any time from the project page. Download links are **signed URLs** expiring in 24 hours, regenerable on demand.
- **BR-U08** — If export fails due to a system error, coins are **not** consumed. Charge only after the first export job reaches `success`; until then the project sits in `unlocking`.

### 5.3 Print Orders

- **BR-O01** — A print order can only be created from the user's own project and only if it passes **print-readiness validation** (§5.5).
- **BR-O02** — Order total = (unit price × qty) + finishing surcharges + shipping. All components are itemized at checkout.
- **BR-O03** — Shipping is computed from total weight (weight per sheet × sheet count × qty + packaging weight) and destination.
- **BR-O04** — Order status: `pending_payment` → `paid` → `in_production` → `shipped` → `delivered`. Side states: `cancelled`, `expired`, `refunded`.
- **BR-O05** — When an order reaches `paid`, the linked project is **unlocked for free** (no coin charge), so the user keeps the digital file.
- **BR-O06** — Orders in `pending_payment` auto-`expire` after **24 hours** without payment proof.
- **BR-O07** — Once `paid`, the design is **frozen as a snapshot**. Later edits do not change what gets printed. The UI must state this before checkout.

### 5.4 Payments

- **BR-P01** — Methods: **manual bank transfer** (proof upload + admin verification) and **QRIS**.
- **BR-P02** — Manual transfers get a **3-digit unique code** appended to the amount for easy reconciliation (e.g. Rp10,000 → Rp10,137).
- **BR-P03** — Payments cover two things: **coin top-ups** and **print orders**. Both use one `payments` table with a polymorphic `payable_type`.
- **BR-P04** — Manual verification records which admin approved, when, and against what evidence.

### 5.5 Print-Readiness Validation

Run before export and before checkout; results shown as a pass/warn/block list.

| Code | Check | Severity |
|---|---|---|
| `VLD-RES` | Every image ≥ 150 DPI at final print size | Warning (< 150 DPI = Blocker) |
| `VLD-BLEED` | Background elements reach full bleed (no white edge) | Warning |
| `VLD-SAFE` | No important element outside the safe area | Warning |
| `VLD-EMPTY` | No required image slot left empty | Blocker |
| `VLD-MONTH` | All 12 months present, no duplicates | Blocker |
| `VLD-FONT` | Every font used is available to the renderer | Blocker |

Blockers stop the flow. Warnings require an acknowledgement checkbox.

---

## 6. Product Catalog

These are **seed presets**, all editable by admin via `product_presets`. Nothing here is hardcoded.

| Code | Name | Trim size | Orientation | Sheets | Bleed | Safe margin | Notes |
|---|---|---|---|---|---|---|---|
| `DESK-A5L` | Desk calendar | 210 × 148 mm | Landscape | 13 (cover + 12) | 3 mm | 7 mm | Top spiral, triangular stand |
| `DESK-SQ` | Square desk calendar | 150 × 150 mm | Square | 13 | 3 mm | 7 mm | |
| `WALL-12` | Wall, 12 sheets | 297 × 420 mm (A3) | Portrait | 12 | 3 mm | 10 mm | 1 month per sheet |
| `WALL-6` | Wall, 6 sheets | 320 × 480 mm | Portrait | 6 | 3 mm | 10 mm | 2 months per sheet |
| `WALL-1` | Wall, single sheet | 420 × 594 mm (A2) | Portrait | 1 | 3 mm | 12 mm | All 12 months on one page |

Preset attributes: `name`, `width_mm`, `height_mm`, `orientation`, `sheet_count`, `months_per_sheet`, `has_cover`, `bleed_mm`, `safe_margin_mm`, `unlock_cost_coins`, `weight_gram_per_sheet`, `print_base_price`, `is_active`.

### 6.1 Export File Specification

- Primary format: **PDF**, one file containing all sheets in order.
- Effective raster resolution **300 DPI**; text and shapes remain **vector**.
- PDF page size = trim size + bleed on all four sides.
- **Crop marks** and color bar optional (export toggle).
- Default color space **RGB**; **CMYK** (ISO Coated v2 / SWOP) offered as a toggle, since most local Indonesian print shops accept RGB.
- Fonts must be **embedded**.
- Optional extra formats (Phase 4): 300 DPI PNG per sheet in a ZIP.
- Filename convention: `{project-slug}-{product-code}-{year}-{export-date}.pdf`

### 6.2 Holiday Data

- Table `holidays`: `date`, `name`, `type` (`national` | `joint_leave` | `religious` | `international`), `year`, `is_red_date`.
- **`holidays.name` stores the official Indonesian name verbatim** — `Tahun Baru Masehi`, `Hari Raya Nyepi`, `Idul Fitri`. These are proper nouns and legal designations; translating them would make the calendar wrong. The surrounding interface is English; the holiday names are not.
- Data for the **current and next year** must exist before launch.
- Admin can create, edit, and import JSON per year.
- `is_red_date = true` renders red in the grid; the holiday name is printed in the legend area.
- **Mandatory UI warning**: joint leave days (*cuti bersama*) are often decreed late in the preceding year. Show "Holiday data updated: {date}" in the editor.
- Optional (Phase 4): Hijri dates and Javanese *pasaran* as an additional layer.

---

## 7. Architecture Principles

Full stack and infrastructure decisions live in `01-tech-stack-and-infrastructure.md`. The non-negotiable principles are:

- **AR-01 — One rendering engine.** Browser preview, server preview, and PDF export must all derive from the shared `calendar-core` package. Layout logic is never written twice. This is what guarantees WYSIWYG.
- **AR-02 — Design JSON is the source of truth.** Built-in templates (Phase 1) and the custom editor (Phase 3) share one schema. A template is just a Design JSON with some objects marked `locked: true` and some marked as slots.
- **AR-03 — The calendar grid is a programmatic object**, never an image. Custom object type `calendarGrid` with properties: `month`, `year`, `weekStart` (default `monday`), `locale: id-ID`, `showHolidayNames`, `holidayColor`, `fontFamily`, `cellStyle`, `showWeekNumbers`. Rendered deterministically by `calendar-core`.
- **AR-04 — Millimeters are the internal unit.** Pixel conversion happens only in the view layer (`scale = px_per_mm`). All stored coordinates are in mm, so designs are resolution-independent.
- **AR-05 — All heavy work is asynchronous.** Export, CMYK conversion, and HD preview generation run through a queue with `queued | processing | success | failed` status polled by the UI.
- **AR-06 — Design JSON is versioned** (`schemaVersion`), with a migrator from day one. Old templates must never break when the schema evolves.
- **AR-07 — Large blobs never live in Postgres.** Images, export files, and version snapshots go to object storage. The database holds pointers and small metadata. (This is a hard constraint on the chosen database tier — see `01-tech-stack-and-infrastructure.md` §3.)

---

## 8. Data Model

```
profiles             (id → auth.users.id, name, phone, role, coin_balance_cache, created_at, deleted_at)

coin_packages        (id, name, price_idr, coin_amount, is_active, sort_order, badge)
coin_transactions    (id, user_id, delta, balance_after, reason, reference_type, reference_id,
                      admin_id, created_at)
                     -- append only; reason: topup | unlock | order_bonus | admin_adjust | refund

payments             (id, user_id, payable_type, payable_id, method, gross_amount, unique_code,
                      total_amount, status, proof_key, gateway_ref, paid_at, verified_by,
                      verified_at, expires_at)
                     -- payable_type: coin_topup | order

product_presets      (id, code, name, width_mm, height_mm, orientation, sheet_count, months_per_sheet,
                      has_cover, bleed_mm, safe_margin_mm, unlock_cost_coins, weight_gram_per_sheet,
                      print_base_price, is_active)

templates            (id, name, slug, product_preset_id, category, thumbnail_key, design_key,
                      slot_schema, is_premium, is_active, sort_order)

projects             (id, user_id, title, product_preset_id, template_id, year, start_month,
                      design_json, schema_version, design_bytes, status, unlocked_at,
                      unlock_transaction_id, thumbnail_key, created_at, updated_at, deleted_at)
                     -- status: draft | unlocking | unlocked

project_assets       (id, project_id, user_id, storage_key_print, storage_key_preview,
                      storage_key_thumb, width_px, height_px, mime, size_bytes, created_at)

export_jobs          (id, project_id, user_id, options_json, status, progress, file_key,
                      file_size, error_message, started_at, finished_at)

orders               (id, order_number, user_id, project_id, design_snapshot_key, product_preset_id,
                      qty, paper_option, finishing_option, item_price, shipping_courier,
                      shipping_service, shipping_cost, total_weight_gram, subtotal, total, status,
                      notes, tracking_number, shipped_at, delivered_at, created_at)

addresses            (id, user_id, recipient_name, phone, province_id, city_id, district_id,
                      postal_code, full_address, is_default)

regions              (id, parent_id, level, name)        -- province / city / district
holidays             (id, date, name, type, year, is_red_date, source, created_at)
settings             (key, value_json)                    -- WhatsApp number, bank accounts, QRIS image, origin address
audit_logs           (id, actor_id, action, target_type, target_id, meta_json, ip, created_at)
```

Integrity rules:

- `coin_transactions` is **append-only**. No UPDATE, no DELETE. Corrections are compensating entries.
- Deducting coins and changing project status happen in **one database transaction**.
- Every project/asset query is filtered by the caller's `user_id` (prevents IDOR).
- `projects` uses soft delete; hard delete only via a data-deletion request.
- Columns ending in `_key` store object-storage keys, not URLs. URLs are signed at request time.
- `design_json` is stored as `jsonb` (Postgres TOAST-compresses it). Track `design_bytes` so growth can be monitored against the database quota; migrate designs to object storage when the quota approaches its limit (see `01-…` §3.2).

---

## 9. Site Map

**Public**
- `/` — Homepage: hero, calendar types with print samples, 3-step how-it-works, coin pricing and benefits, FAQ, WhatsApp CTA
- `/samples` — Sample gallery per calendar type
- `/pricing` — Coin packages, benefits, print pricing
- `/how-it-works`, `/faq`, `/terms`, `/privacy`, `/refunds`
- `/signin`, `/signup`, `/forgot-password`, `/verify-email`

**Authenticated**
- `/app` — Dashboard: projects, coin balance, recent orders
- `/app/new` — Choose calendar type → template or custom
- `/app/projects/[id]` — Editor (template or custom mode)
- `/app/projects/[id]/preview` — Full preview + print-readiness report
- `/app/projects/[id]/export` — Export options, coin unlock, file history
- `/app/projects/[id]/order-print` — Print checkout
- `/app/coins` — Balance, history, buy packages
- `/app/orders`, `/app/orders/[id]` — Order history and tracking
- `/app/settings` — Profile, addresses, password, delete account

**Admin**
- `/admin` — Overview (revenue, top-ups, orders, exports)
- `/admin/payments` — Manual verification queue
- `/admin/orders` — Order board, print-file download, tracking entry
- `/admin/templates` — Template CRUD
- `/admin/products` — Product presets and print pricing
- `/admin/coins` — Coin packages, manual balance adjustments
- `/admin/holidays` — Holiday CRUD and import
- `/admin/users` — User search, projects, password reset
- `/admin/settings` — WhatsApp number, bank accounts, QRIS, origin address, shipping

> Routes, like the rest of the interface, are in English. See §10.7 for what stays Indonesian and why.

---

## 10. Non-Functional Requirements

### 10.1 Security
- **NFR-S01** — Passwords hashed by the auth provider (Argon2id or bcrypt cost ≥ 12). Never roll custom hashing.
- **NFR-S02** — Rate limits: login 5/min/IP, signup 3/hour/IP, upload 30/hour/user, export 10/hour/user.
- **NFR-S03** — Uploads validated by **magic bytes**, not extension. Allowlist: JPEG, PNG, WebP, HEIC. Max 15 MB per file.
- **NFR-S04** — All user files live in a private bucket, reachable only through signed URLs.
- **NFR-S05** — EXIF metadata (including GPS) is **stripped** during processing. These are family photos; home coordinates must not leak.
- **NFR-S06** — CSRF protection on all mutations; security headers (CSP, HSTS, X-Content-Type-Options).
- **NFR-S07** — Payment proofs visible only to the owner and admins.
- **NFR-S08** — Admin endpoints guarded by role middleware and written to `audit_logs`.
- **NFR-S09** — **Row Level Security enabled with deny-by-default policies on every table**, even though the application server uses a privileged connection. If a public API key ever leaks, the blast radius must be zero. See `01-…` §5.3.

### 10.2 Privacy
- **NFR-P01** — The privacy policy states what is stored, for how long, and how to delete it.
- **NFR-P02** — User photos are **never** used for marketing or public samples without explicit written opt-in (default off).
- **NFR-P03** — Account deletion removes photos, projects, and exports within 7 days. Financial records are retained per bookkeeping needs, anonymized.
- **NFR-P04** — Assets on `draft` projects untouched for 12 months may be purged after two email notices.

### 10.3 Performance
- **NFR-F01** — Homepage LCP < 2.5s on 4G.
- **NFR-F02** — Editor stays responsive (≥ 30 fps) with 12 sheets × 20 objects.
- **NFR-F03** — Single-sheet preview appears < 3s after a change.
- **NFR-F04** — Export completes within these p95 budgets on the 1 GB production instance: desk calendar (13 sheets) < 90s; A3 wall calendar (12 sheets) < 3 min; A2 single sheet < 90s. Exports are queued and asynchronous, so the user is never blocked — the progress indicator carries the experience.
- **NFR-F05** — Project autosave debounced to at most every 5s, with a visible save-state indicator.
- **NFR-F06** — Peak resident memory during any single export must stay within the budget in `01-tech-stack-and-infrastructure.md` §4.2. Rendering must never be able to exhaust memory and take down the web process. This is a correctness requirement, not a performance one.

### 10.4 Reliability
- **NFR-R01** — **Nightly database backup to object storage, retained 14 days, with a restore drill before the first payment is accepted.** Non-negotiable: the coin ledger is money.
- **NFR-R02** — Failed export jobs retry twice with backoff before being marked `failed`.
- **NFR-R03** — Errors reported to Sentry (or equivalent) with a trace ID also shown to the user.

### 10.5 Compatibility & Accessibility
- **NFR-C01** — Last two versions of Chrome, Safari, Firefox, Edge.
- **NFR-C02** — Marketing pages, dashboard, preview, and checkout **must** work well on mobile.
- **NFR-C03** — The canvas editor may require ≥ 1024 px width. On smaller screens show a friendly message but still allow preview, unlock, export, and print ordering. Most Indonesian traffic is mobile — never block the payment path.
- **NFR-C04** — WCAG AA contrast minimum; everything outside the canvas is keyboard reachable.

### 10.6 Content & Legal
- **NFR-L01** — WhatsApp number, bank accounts, and QRIS image live in `settings`, never hardcoded.
- **NFR-L02** — Terms, Privacy Policy, and Refund Policy must exist before the first payment is accepted.
- **NFR-L03** — Prohibited content (hate speech, pornography, third-party copyrighted material) is listed in the Terms; admins can suspend violating projects.

### 10.7 Language

There are **two distinct language layers**, and confusing them is the most likely source of bugs in this area.

**Layer 1 — The application is English.** Navigation, buttons, forms, emails, error messages, the editor, and the admin panel. This is the tool.

**Layer 2 — The calendar artifact is Indonesian.** Everything that ends up on the printed sheet renders in Bahasa Indonesia: month names (`Januari`), weekday labels (`Sen`, `Sel`, `Rab`, `Kam`, `Jum`, `Sab`, `Min`), holiday names, and the holiday legend. This is the product, and it hangs on an Indonesian wall.

The rule in one line: **English chrome, Indonesian output.**

This split is not negotiable per-user in Phase 1 — the calendar always renders Indonesian. A language option for the artifact is a Phase 4 consideration, not an MVP feature.

Data that stays Indonesian regardless of layer, because translating it would make it **incorrect** rather than merely unlocalized:

| Stays Indonesian | Reason |
|---|---|
| `holidays.name` | Official designations. `Hari Raya Nyepi` is not "Day of Silence" |
| Month and weekday names on the sheet | Printed output, per Layer 2 |
| Courier names | JNE, J&T, SiCepat, POS Indonesia, Anteraja are brands |
| `regions` names | Administrative place names — `Jawa Barat`, not "West Java", since these must match courier and address systems |
| Address format | Indonesian postal convention: RT/RW, kelurahan, kecamatan |
| Currency | Rupiah, formatted `Rp10.000` with Indonesian separators |
| Payment terms | QRIS, Virtual Account, and bank names appear as-is |

Practical consequences for implementation:

- **Number and date formatting stays `id-ID`** even though the copy is English. Prices read `Rp1.250.000`, not `Rp1,250,000`. The week starts Monday. Do not switch the application to `en-US` formatting just because the copy is English.
- **`calendar-core` is locked to `id-ID`.** The rendering package has no locale parameter in Phase 1. Hardcoding the locale here is deliberate: it makes Layer 2 impossible to break from the application side.
- **Controls that edit printed content display the printed value.** A month picker in the editor shows `Januari`, not `January`, because that is what the user will see on the sheet. The surrounding label ("Month") is English. Without this rule the editor and the canvas disagree, and users report it as a bug.
- **All application strings route through one file** (`en.ts`). Calendar output strings live in `calendar-core`, never in `en.ts` — mixing them is how Layer 2 leaks into Layer 1.
- **English copy is written for Indonesian readers**: plain, concrete vocabulary; no idioms, no wordplay, short sentences. "Photos you upload stay private," not "Your memories, safe and sound."

---

## 11. Roadmap

| Phase | Focus | Outcome | Document |
|---|---|---|---|
| **1** | Revenue-capable MVP | Homepage, auth, template-based calendars, preview, manual top-up, coin unlock, PDF export, minimal admin, WhatsApp CTA | `02-phase-1-mvp.md` |
| **2** | Physical print orders | Print catalog, addresses, shipping, checkout, QRIS/transfer, tracking, admin order board. **Deferred past launch** — at launch, print requests go through WhatsApp (P1-US-105). Build this only once click data justifies it (ADR-0007) | `03-phase-2-print-orders.md` |
| **3** | Custom editor | Drag & drop, layers, text, shapes, configurable calendar grid, templates from scratch | `04-phase-3-custom-editor.md` |
| **4** | Growth & polish | SEO, 3D mockups, CMYK, coupons, automated WhatsApp, analytics, payment gateway | `05-phase-4-growth.md` |

**The ordering is deliberate.** Phase 1 can take money. Phase 2 adds the higher-margin revenue line. Phase 3 is the heaviest and most schedule-risky work, so it comes after the business is running — but AR-02 means its architecture is already in place from Phase 1, so nothing gets rewritten.

---

## 12. Decisions Awaiting Owner Confirmation

Each has a **working default** so execution is never blocked.

| # | Question | Default in use |
|---|---|---|
| 1 | Same unlock cost for every calendar type? | Yes, 1 coin (per-preset override exists) |
| 2 | Can an unlocked project change its year? | No — must duplicate (BR-U05) |
| 3 | Always January–December? | Yes for Phase 1; arbitrary start month deferred to Phase 4 |
| 4 | Print in-house or via vendor? | Vendor assumed; admin downloads the PDF manually. No vendor API integration |
| 5 | Minimum print order? | 1 pc; quantity discounts in Phase 4 |
| 6 | Shipping rates via API or manual table? | Phase 2 uses an **admin-managed manual rate table**; an `ApiRateProvider` interface is stubbed for later |
| 7 | QRIS via gateway or static? | **Static QRIS + manual confirmation** in Phase 2; automated gateway in Phase 4 |
| 8 | B2B (company calendars, logos, bulk)? | Out of scope for Phases 1–3; flagged for Phase 4 |
| 9 | Export file retention? | Indefinite while the account is active |
| 10 | Brand name and domain? | **Settled: BuildCalendar.** Domain still to be registered |

**Items 4, 5, 6, and 7 must be locked before Phase 2 begins** — they drive pricing structure and schema. Since Phase 2 is now deferred past launch (ADR-0007), these are no longer blockers for Phase 1. Sourcing a print vendor still matters early, though — the spike (P1-US-000) needs a real print shop to validate the output.

---

## 13. Working Rules for the AI Executor

1. **Complete one phase fully** against its Definition of Done before moving on. Do not interleave phases.
2. **Never hardcode** anything that belongs in `settings`, `product_presets`, or `coin_packages`.
3. **Use migrations.** Never modify the database by hand or through a dashboard UI.
4. Each user story carries a **checklist of acceptance criteria**. A story is done only when every box is checked and every rule tagged `BR-*` has an automated test.
5. **Minimum required tests:** coin ledger (including the race condition on concurrent unlock), upload validation, project ownership enforcement, order total calculation.
6. When a requirement is ambiguous, **choose the simplest option that does not block a later phase**, then record the decision in `DECISIONS.md` in the repo.
7. All user-facing copy is in English, except the locale-bound data listed in §10.7. All code, identifiers, and comments are in English.
8. At the end of each phase, produce a `CHANGELOG.md` and a `README` whose setup instructions have actually been verified from a clean checkout.
