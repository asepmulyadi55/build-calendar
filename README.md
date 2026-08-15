# BuildCalendar

Print-ready calendars from your own photos, with Indonesian public holidays filled in automatically. Users pick a design, drop in photos, preview the result, then unlock a 300 DPI print-ready PDF with prepaid coins — or ask us to print and ship it.

**Status:** specification and design complete. Development has not started.
**Target:** live for the 2028 calendar season, October–December 2027.

---

## Repository layout

```
CLAUDE.md              Persistent context — Claude Code reads this every session
.claude/
  README.md                      What is configured here and why
  skills/                        Procedures loaded on demand when work touches a risky area
    coin-ledger/                   coins, payments, unlocking
    renderer-memory/               Chromium, PDF export, the 1 GB budget
    calendar-output/               the English app / Indonesian calendar split
    db-and-rls/                    migrations, RLS, connection strings
    build-ui/                      translating the prototype into components
    finish-epic/                   /finish-epic — close out an epic properly
    audit-drift/                   /audit-drift — read-only drift review
docs/
  00-master-spec.md              Business rules, data model, NFRs, language rules
  01-tech-stack-and-infrastructure.md   Stack, 1 GB memory budget, Supabase traps
  02-phase-1-mvp.md              The stories being built now
  03-phase-2-print-orders.md     Deferred past launch
  04-phase-3-custom-editor.md    Future
  05-phase-4-growth.md           Future
  DECISIONS.md                   Why things are the way they are
  PROMPTS.md                     Ready-to-paste prompts for Claude Code
design/                Clickable HTML prototype of every Phase 1 screen
  index.html                     Start here
  sitemap.html                   Every screen, linked
  project-plan.html              Flow diagram and timeline
  assets/ds.css                  Design system — source for Tailwind tokens
```

Application code (`apps/`, `packages/`, `infra/`) does not exist yet. The first session creates it.

## Where to start

1. Open `design/index.html` in a browser and click through the prototype.
2. Read `docs/DECISIONS.md`. It is short, and it explains the constraints that shape everything else.
3. Open `docs/PROMPTS.md` and run Session 0 — the spike.

Do not start Session 1 until the spike produces a printed sheet you would be willing to sell.

## The three things most likely to go wrong

**The print pipeline doesn't work.** The whole product depends on Puppeteer producing genuinely print-ready PDFs that an Indonesian print shop accepts. The spike exists to find this out in week one rather than month four.

**The 1 GB server can't render an A2 sheet.** The memory budget in `docs/01-…` §4.2 is tight by choice. Eight requirements tagged `RQ-MEM-*` keep it viable. They are not optimisations and must not be relaxed for convenience.

**The templates never get made.** Three designs is real design work, done by the same person writing the code. If they don't exist by February 2027, the editor has nothing to edit and everything after it slips.

## Conventions

- Interface English, calendar output Bahasa Indonesia. See master spec §10.7.
- Code, identifiers and comments English. User-facing routes English.
- Number formatting stays `id-ID` — `Rp1.250.000`, week starts Monday.
- One epic per working session, reviewed before the next begins.
