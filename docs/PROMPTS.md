# Prompts for Claude Code

Every session written out. Copy the block, paste it into Claude Code from the repository root, run one per sitting.

`CLAUDE.md` loads automatically every session and the skills load when the work matches, so prompts stay short on purpose. If you find yourself pasting the same context repeatedly, that context belongs in `CLAUDE.md` or in a skill — not in a prompt.

**Two rules that prevent almost every mistake:**

- The hundreds digit of a story ID is its epic number. `P1-US-2xx` is always Epic 2.
- Never rewrite the closing instructions. They live in the `finish-epic` skill so there is exactly one copy to keep correct.

---

## Session map

| Session | Epic | Stories | Design pages | Status |
|---|---|---|---|---|
| 0 | — | `P1-US-000` | — throwaway spike | **code done** · print-shop check outstanding |
| 1 | 0 | `P1-US-001`, `003` | `assets/ds.css` | **done** · base components outstanding |
| 2 | 0 | `P1-US-002` | — no UI | **done** |
| 3 | 1 | `P1-US-101`–`104` | `index`, `samples`, `pricing` | **done** · 3 items partial |
| 4 | 2 | `P1-US-201`–`203` | `signin`, `signup` | **done** · 5 items partial |
| 5 | 7 | `P1-US-702` | `admin` | **done** · 2 items partial |
| 6 | 3 | `P1-US-301`, `302` | `app-new` | |
| 7 | 3 | `P1-US-303`, `304`, `305` | `app-editor` | |
| 8 | 6 | `P1-US-601` | — renderer, no UI | |
| 9 | 4 | `P1-US-401`, `402` | `app-preview` | |
| 10 | 5 | `P1-US-501`, `502`, `503` | `app-coins`, `admin` | |
| 11 | 6 | `P1-US-602`, `603` | `app-export` | |
| 12 | 7 | `P1-US-701`, `703` | `admin` | |
| 13 | 1 | `P1-US-105` + real sample images | `index`, `app-preview` | |

Two things are carried forward rather than blocking. Neither is code:

- **The spike gate is not closed.** Session 0's exit criteria are a peak-RSS measurement *and* a printed sheet you would sell. The measurement passed; the sheet has not been printed. Sessions 1 and 2 built no renderer architecture, so the cost of running ahead is still near zero — it stops being near zero at Session 8.
- **Four of nine base components have no design.** Button, Input, Card, Modal and Badge exist in `assets/ds.css`. Toast, Tabs, EmptyState and Skeleton appear nowhere in `design/`, so building them means inventing a design rather than translating one.

Two orderings are deliberate. **Session 5 builds template management before the editor**, because without templates in the database the editor has nothing to open and cannot be tested. **Session 13 comes last** because it needs project codes and real print screenshots, neither of which exists earlier.

---

## Session 0 — The spike ✅ done

**Status: code done · print-shop check outstanding**

> **Ran 2026-08-16.** A3 measured 303.02 × 426.13 mm and A2 426.13 × 600.03 mm, both inside the ±0.5 mm tolerance. Text is vector: 52 extractable objects and 3 embedded font subsets per sheet. Under `docker run -m 1g`: cold job 219 MB (A3) and 229 MB (A2), warm worker 375 MB and 393 MB, no OOM. Inside the §4.2 budget, so no degradation step was applied. Report and PDFs are in `spike/`.
>
> **Outstanding:** the printed sheet. Take `spike/out/a3-303x426mm.pdf` to a print shop.
>
> Also open, from the report's §3: whether to raise the 4000 px print-derivative cap (A2 needs 5031 px at 300 DPI) and whether the renderer's `mem_limit` stays at 500 MB when warm A2 peaks at 393–430 MB.

Throwaway code whose only job is to turn the project's two riskiest assumptions into measurements. Do not let it become the real renderer.

```
Read CLAUDE.md, then docs/02-phase-1-mvp.md story P1-US-000, then
section 4.2 of docs/01-tech-stack-and-infrastructure.md.

Build a throwaway spike in /spike. It is not architected, not tested,
and will be deleted. Its only purpose is to answer two questions with
numbers.

1. Can Puppeteer produce a genuinely print-ready PDF?
   - Render one A3 sheet: a placeholder photo plus a January 2027
     calendar grid in Bahasa Indonesia (Januari, Sen-Min, 1 Jan =
     Tahun Baru Masehi, Sundays red).
   - Page size must be exactly 303 x 426 mm (A3 plus 3 mm bleed on
     all sides).
   - Text must stay vector, not raster.
   - Use the SVG-into-HTML-into-page.pdf approach from P1-US-601,
     not a screenshot.
   - Repeat for A2 single sheet (426 x 600 mm), the heaviest page.

2. Does it fit in 1 GB of RAM?
   - Provide a Dockerfile and a command that runs under
     `docker run -m 1g`.
   - Report peak RSS for both A3 and A2 via docker stats.
   - Compare against the budget table in section 4.2.

Deliverables: /spike with a README, two PDFs in /spike/out, and a
short report covering measured page dimensions, whether text is
selectable, peak RSS per format, and whether it fits budget.

Do not build any part of the real application. No Prisma, no Supabase,
no Next.js, no queue. When the report is written, stop.
```

**Check by hand:** open both PDFs, confirm the page size and that you can select the text. Then print the A3 at a real print shop and inspect colour, trim, and small type. If you would not sell that sheet, stop and rethink the architecture.

---

## Session 1 — Foundation ✅ done

**Status: done · base components outstanding**

> **Ran 2026-08-16.** Monorepo, Docker Compose (web, renderer, redis, caddy — no Postgres), Prisma with both URLs, commented `.env.example`, ESLint + Prettier + TS strict, CI, and `pnpm check:rls`. Design tokens live in `packages/ui/src/theme.css`, copied value-for-value from `ds.css`. Verified from a clean checkout: install, migrate, seed, `pnpm dev`, and all gates.
>
> The RLS gate was tested against a throwaway Postgres and proven to fail both ways — a missing `ENABLE ROW LEVEL SECURITY` and a missing deny-all policy. `anon` and `authenticated` are denied on every table.
>
> **Outstanding:** the nine base components of `P1-US-003`. Five have a design and can be built with the first screen that uses them; four do not exist in `design/` at all and need designing first.

```
Read CLAUDE.md and docs/02-phase-1-mvp.md stories P1-US-001 and
P1-US-003.

Build the repository skeleton only. No product features.

- Monorepo per section 1.1 of docs/01-tech-stack-and-infrastructure.md
- Docker Compose for web, renderer, redis, caddy. Postgres is remote
  Supabase, not a local container.
- Prisma configured with both DATABASE_URL and DIRECT_URL
- .env.example listing every variable from section 6, each commented
- pnpm dev / test / db:migrate / db:seed working from a clean checkout
- ESLint, Prettier, TypeScript strict, CI failing on type errors
- A CI check that fails if a migration creates a table in the public
  schema without enabling RLS
- Design tokens in the Tailwind config, extracted from
  design/assets/ds.css. Do not invent new values.

Do not build calendar-core, auth, or any page beyond a health check.
Finish by writing the README setup steps and verifying them yourself
from a clean clone.
```

---

## Session 2 — calendar-core ✅ done

**Status: done**

> **Ran 2026-08-16.** All nine acceptance criteria met. 111 tests, written before the implementation, covering the four required cases plus UTC determinism, input validation, and the language split. Zero DOM dependencies enforced three ways: `tsconfig` omits the DOM lib, a test asserts the source touches no DOM global and imports nothing outside the package, and `package.json` declares no dependencies and no peer dependencies.
>
> Two judgement calls that a reviewer should know about, because neither is obvious from the code:
>
> - `renderCalendarGridToFabric` returns Fabric's **serialised** form, not a live `Group`. Importing Fabric would have broken the zero-DOM criterion — its default entry is the browser build and its `./node` entry pulls in `canvas` and `jsdom`. Consumers call `util.enlivenObjects([...])`. Type names were verified against fabric 6.7.1 source, not guessed.
> - `fonts.ts` lists exactly what `infra/Dockerfile.renderer` installs today — the DejaVu and Liberation families. The interface faces from `ds.css` are deliberately absent because they are not in the image, and a font in the picker but not in the image substitutes silently.
>
> **Check by hand:** confirm a real `fabric.Group` built from this JSON positions its children as intended. Child coordinates are group-top-left relative with `originX`/`originY` of `left`/`top`. It is the one thing that could not be exercised without importing Fabric.

```
Read CLAUDE.md and docs/02-phase-1-mvp.md story P1-US-002.

Build packages/calendar-core. Zero DOM dependencies, so it runs
identically in Node and the browser.

- buildMonthMatrix(year, month, weekStart)
- resolveHolidays(year, month, holidays)
- Design JSON types with schemaVersion
- renderCalendarGridToFabric(props, scale)
- mmToPx / pxToMm
- Indonesian month and weekday tables, hardcoded, with NO locale
  parameter
- fonts.ts as the single font allowlist

Write the tests first: leap-year February, a month starting on Sunday,
Monday vs Sunday week start, and two holidays on one date.

Nothing outside this package.
```

---

## Session 3 — Public pages ✅ done

**Status: done · 3 items partial**

> **Ran 2026-08-17.** Eight public pages render from the database — homepage, samples gallery with a working lightbox, pricing, FAQ, how-it-works, and three legal pages as MDX. Coin packages, product formats and the WhatsApp number all come from Postgres. 144 tests pass, including scans that fail the build if a component contains a hardcoded price, phone number, or hex colour.
>
> **Partial:** the sample gallery still shows placeholder gradients (real photos are Session 13), the footer has no social links (no accounts exist), and the WhatsApp button only appears on public pages (authenticated pages don't exist yet). Full acceptance-criteria detail lives with the code review, not here — `docs/02-phase-1-mvp.md` is not edited by any session.

```
Read CLAUDE.md. Then read docs/02-phase-1-mvp.md, epic 1, stories
P1-US-101, P1-US-102, P1-US-103, P1-US-104.

Implement only those stories. Work through the acceptance criteria in
order and make every checkbox genuinely true.

Write tests before implementing anything tagged BR-* or RQ-MEM-*.

Match the visual design in design/index.html for the homepage,
design/samples.html for the gallery, and design/pricing.html for the
pricing page. Use the tokens already in the Tailwind config; introduce
no new colours, sizes, or spacing.

Three things specific to this epic:

- The sample gallery uses placeholder gradients for now. Real print
  screenshots replace them in Session 13. Build the gallery from data
  so swapping them is a data change, not a markup change.
- Coin packages come from the database and the WhatsApp number comes
  from settings. Nothing on these pages is hardcoded.
- Keep the coin explainer copy as written in the prototype. It is the
  most conversion-critical block on the site and the wording was
  chosen deliberately.

Skip P1-US-105 — it needs project codes that do not exist yet.

When the code is finished, run /finish-epic and follow it exactly.
Do not begin the next epic.
```

**Check by hand:** read the pricing page as if you had never seen the product. Does the coin mechanic make sense on one read?

---

## Session 4 — Accounts and authentication ✅ done

**Status: done · 5 items partial**

> **Ran 2026-08-17.** Registration, sign in and out, password reset, email verification and account settings. 197 tests pass, 50 of them on the security-critical paths: open-redirect rejection on `callbackUrl`, the rate limits from NFR-S02, the password policy, the verification gate, and seven asserting that no error message reveals whether an email is registered. The `auth.users` trigger was executed against a throwaway Postgres and copies name and phone for all four signup shapes, including Google's `full_name` and empty metadata.
>
> **Partial, and almost none of it is code:** custom SMTP and the Google provider are configured in the Supabase dashboard, not in this repository, so neither has been exercised end to end. Reset-token lifetime is Supabase's own setting. The verification gate is built and tested but has no call site until Epic 5 spends a coin. The NFR-P03 purge job does not exist — there is nothing to purge yet.

```
Read CLAUDE.md. Then read docs/02-phase-1-mvp.md, epic 2, stories
P1-US-201, P1-US-202, P1-US-203.

Implement only those stories. Work through the acceptance criteria in
order and make every checkbox genuinely true.

Write tests before implementing anything tagged BR-* or RQ-MEM-*.

Match the visual design in design/signin.html and design/signup.html.
Use the tokens already in the Tailwind config; introduce no new
colours, sizes, or spacing.

Four things specific to this epic:

- Configure custom SMTP before testing anything. Supabase's built-in
  mailer is rate-limited to a handful of messages per hour and is not
  for production; verification emails will silently stop arriving and
  it will look like a bug in your own code.
- Add the Postgres trigger on auth.users that creates the matching
  public.profiles row.
- An unverified user may sign in but must not be able to top up or
  unlock. Enforce that on the server, not only in the UI.
- Error messages must never reveal whether an email is registered.

When the code is finished, run /finish-epic and follow it exactly.
Do not begin the next epic.
```

**Check by hand:** sign up with a real address and confirm the email arrives. Then try to reach a top-up endpoint before verifying.

---

## Session 5 — Template management ✅ done

**Status: done · 2 items partial**

> **Ran 2026-08-17.** Template CRUD in the admin panel, file-based import with validation, a to-scale preview, and an activate step that only exists on the template page. 229 tests pass, 36 of them on the validator: schema conformance, sheet count against the preset, and slot-id uniqueness across the whole design. The three launch templates are real files in `packages/db/templates/`, and `pnpm db:seed` validates each against its preset — a broken launch template now fails the seed rather than the first customer. Format documented in `docs/template-format.md`.
>
> **Partial:** the full import round trip — upload, R2 write, row, activate — was exercised against MinIO and a throwaway Postgres, not through the browser as a signed-in admin, because that needs an admin account in the real Supabase project. And the preview is a schematic rather than a render; the real renderer is Session 8 (ADR-0011).

Built before the editor on purpose: without templates in the database, the editor has nothing to open.

```
Read CLAUDE.md. Then read docs/02-phase-1-mvp.md, epic 7, story
P1-US-702.

Implement only that story. Work through the acceptance criteria in
order and make every checkbox genuinely true.

Match the visual design in design/admin.html. Use the tokens already
in the Tailwind config; introduce no new colours, sizes, or spacing.

Three things specific to this story:

- Phase 3 does not exist, so template authoring is file-based: the
  admin drops a Design JSON plus assets and the panel imports them.
  Document the format in docs/template-format.md.
- Validate on import: the JSON matches the schema, sheet count matches
  the product preset, and every slot has a unique id. Reject with a
  clear message rather than storing something broken.
- Seed three templates, not six. The owner designs these alone
  (ADR-0007).

When the code is finished, run /finish-epic and follow it exactly.
Do not begin the next epic.
```

---

## Session 6 — Choosing a format and a design

```
Read CLAUDE.md. Then read docs/02-phase-1-mvp.md, epic 3, stories
P1-US-301 and P1-US-302.

Implement only those stories. Work through the acceptance criteria in
order and make every checkbox genuinely true.

Match the visual design in design/app-new.html. Use the tokens already
in the Tailwind config; introduce no new colours, sizes, or spacing.

Three things specific to these stories:

- Selecting a template COPIES its Design JSON into the new project. It
  is never a reference. A later change to a template must not alter
  anyone's existing calendar.
- "Start from scratch" is rendered disabled with a "Coming soon"
  label. Do not build it — that is Phase 3.
- A signed-out visitor who picks a template goes to
  /signin?callbackUrl=... and lands back on the same choice.

When the code is finished, run /finish-epic and follow it exactly.
Do not begin the next epic.
```

---

## Session 7 — The template editor

The largest session in Phase 1. Splitting it across two sittings is sensible: `P1-US-303` first, then `304` and `305`.

```
Read CLAUDE.md. Then read docs/02-phase-1-mvp.md, epic 3, stories
P1-US-303, P1-US-304, P1-US-305.

Implement only those stories. Work through the acceptance criteria in
order and make every checkbox genuinely true.

Match the visual design in design/app-editor.html. Use the tokens
already in the Tailwind config; introduce no new colours, sizes, or
spacing.

Five things specific to this epic:

- Only objects listed in slot_schema are editable. Everything else is
  locked and not selectable.
- Uploads: validate by magic bytes, strip all EXIF including GPS,
  produce three derivatives, discard the original. These are family
  photos; leaked EXIF is a home address.
- The calendar grid is generated by calendar-core, never an image, and
  always renders in Bahasa Indonesia.
- The month selector displays the printed value — "Januari", not
  "January" — while its label stays English.
- Below 1024px, show the small-screen notice from the prototype. Do
  not attempt a phone editor.

When the code is finished, run /finish-epic and follow it exactly.
Do not begin the next epic.
```

**Check by hand:** upload a photo taken on your own phone and confirm the stored derivatives contain no GPS data.

---

## Session 8 — The renderer

```
Read CLAUDE.md. Then read docs/02-phase-1-mvp.md, epic 6, story
P1-US-601, and section 4.2 of
docs/01-tech-stack-and-infrastructure.md.

Implement only that story. Work through the acceptance criteria in
order and make every checkbox genuinely true.

This story is governed by RQ-MEM-01 through RQ-MEM-08. Write the
memory regression test before the implementation: render the A2 single
sheet in a container capped at 1 GB and assert that it completes.

Reuse what the Session 0 spike proved. Do not copy the spike's code —
it was throwaway — but do not rediscover its findings either.

The output must match the spike's verified result: exact page size
including bleed, vector text, embedded fonts, and no outbound network
access during rendering.

When the code is finished, run /finish-epic and follow it exactly.
Do not begin the next epic.
```

**Check by hand:** run an export while watching `docker stats`. Confirm Chromium disappears about a minute after the job finishes.

---

## Session 9 — Preview and print checks

```
Read CLAUDE.md. Then read docs/02-phase-1-mvp.md, epic 4, stories
P1-US-401 and P1-US-402.

Implement only those stories. Work through the acceptance criteria in
order and make every checkbox genuinely true.

Match the visual design in design/app-preview.html. Use the tokens
already in the Tailwind config; introduce no new colours, sizes, or
spacing.

Three things specific to these stories:

- The preview is rendered server-side by the SAME engine as export
  (AR-01). Do not build a second, faster preview path — a preview that
  can disagree with the export defeats the entire purpose.
- The watermark on locked projects must not be removable by editing
  CSS in the browser.
- Cache previews by Design JSON hash. On a 1 GB server, re-rendering
  an unchanged sheet is expensive.

When the code is finished, run /finish-epic and follow it exactly.
Do not begin the next epic.
```

---

## Session 10 — Coins, payments, unlocking

The only part of this codebase that moves real money. The `coin-ledger` skill loads automatically; follow it exactly.

```
Read CLAUDE.md. Then read docs/02-phase-1-mvp.md, epic 5, stories
P1-US-501, P1-US-502, P1-US-503.

Implement only those stories. Work through the acceptance criteria in
order and make every checkbox genuinely true.

Write these tests FIRST, before any implementation, and run them
against a real Postgres rather than a mock — the guarantees being
tested are database guarantees:

- two concurrent unlock requests on the same project deduct exactly
  one coin
- unlocking an already-unlocked project succeeds and deducts nothing
- a failed first export produces a compensating refund entry
- the cached balance equals the sum of the ledger after a random
  sequence of operations

Match the visual design in design/app-coins.html for the user side and
design/admin.html for the verification queue.

Two things that are not negotiable:

- The partial unique index on (project_id) where reason='unlock' goes
  in a migration. The database prevents double-spend, not an if
  statement.
- Coins are charged only after the first export job succeeds. Until
  then the project sits in 'unlocking'.

When the code is finished, run /finish-epic and follow it exactly.
Do not begin the next epic.
```

**Check by hand:** open the unlock button in two browser tabs and click both as fast as you can. The balance must drop by exactly one.

---

## Session 11 — Export and delivery

```
Read CLAUDE.md. Then read docs/02-phase-1-mvp.md, epic 6, stories
P1-US-602 and P1-US-603.

Implement only those stories. Work through the acceptance criteria in
order and make every checkbox genuinely true.

Match the visual design in design/app-export.html. Use the tokens
already in the Tailwind config; introduce no new colours, sizes, or
spacing.

Three things specific to these stories:

- Queue concurrency is 1, so the UI must show queue position rather
  than only "processing". A user waiting behind someone else's A2
  render needs to understand why.
- Locked projects may download a watermarked low-resolution sample
  PDF. This is deliberate: it lets people trust the output before
  paying.
- Every past export stays downloadable at no cost, forever. Signed
  links expire; regenerate them silently rather than making the user
  ask.

P1-US-603 includes automated tests for page dimensions across every
product preset. Write those. The physical print check is mine to do.

When the code is finished, run /finish-epic and follow it exactly.
Do not begin the next epic.
```

**Check by hand:** print one real desk calendar and one real A3 at an actual print shop. Inspect colour, trim alignment, and text sharpness.

---

## Session 12 — Admin panel

```
Read CLAUDE.md. Then read docs/02-phase-1-mvp.md, epic 7, stories
P1-US-701 and P1-US-703.

Implement only those stories. Work through the acceptance criteria in
order and make every checkbox genuinely true.

Match the visual design in design/admin.html. Use the tokens already
in the Tailwind config; introduce no new colours, sizes, or spacing.

Three things specific to these stories:

- Coin packages, product presets, holidays and site settings are all
  editable here. Nothing they control may remain hardcoded anywhere in
  the codebase — this session is where that gets proven.
- Manual balance adjustments require a reason and write to audit_logs.
  No anonymous balance changes, ever.
- Admin routes are guarded by role middleware and excluded from search
  engine indexing.

Load holiday data for 2027 and 2028 as part of the seed.

When the code is finished, run /finish-epic and follow it exactly.
Do not begin the next epic.
```

---

## Session 13 — Print requests and real samples

Last because it needs project codes and real print output, neither of which existed earlier.

```
Read CLAUDE.md. Then read docs/02-phase-1-mvp.md, epic 1, story
P1-US-105.

Implement only that story. Work through the acceptance criteria in
order and make every checkbox genuinely true.

This story is a WhatsApp deep link and nothing more. It is roughly
four hours of work replacing about 120 hours of Phase 2 checkout
(ADR-0007).

Do not build address forms, shipping calculations, order records, or
"a small version" of checkout. A half-built checkout is worse than an
honest manual one. If you believe one is needed, say so and stop.

Also replace the placeholder gradients in the sample gallery with the
real print screenshots now available, using the data-driven structure
built in Session 3.

When the code is finished, run /finish-epic and follow it exactly.
```

---

## Before accepting the first real payment

Not a build session. Run both of these, then work through the checklist.

```
/security-review
```

```
/audit-drift
```

Then complete the pre-launch checklist in section 7 of `docs/01-tech-stack-and-infrastructure.md`. The two items people skip are the ones that matter most: a database restore you have actually performed, and five real people using the product unaided while you watch in silence.

---

## When something feels wrong

Run `/audit-drift`. It is read-only and reports violations without fixing them. Use it when a session's output feels off, before a long break, and every few sessions as routine hygiene.

The section worth reading most carefully is overclaimed completeness — acceptance criteria previously reported as done that turn out not to be.

---

## Notes on working this way

**One session per sitting.** At 8 hours a week this is also about one sitting's worth of review capacity, which is not a coincidence. The limit is your ability to check the work, not the agent's ability to produce it.

**Review at the end of every session, never later.** Letting several accumulate unreviewed is the most common way a month disappears on a project like this.

**When the agent proposes something clever, check `docs/DECISIONS.md` first.** Most constraints here look like inefficiencies until you know the reason. A warm Chromium pool is faster right up until it takes the website down.

**Keep the spike's report.** When you later wonder whether the 1 GB server was ever a real constraint, that measurement is the answer.

**If a session runs long, split it rather than rushing.** Session 7 in particular is fine across two sittings.
