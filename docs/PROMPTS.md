# Prompts for Claude Code

Copy a prompt, paste it into Claude Code from the repository root, run one per session.

`CLAUDE.md` is read automatically every session, so these prompts stay short on purpose. If you find yourself pasting the same context repeatedly, that context belongs in `CLAUDE.md`, not in a prompt.

---

## Session 0 — The spike (do this first)

This is throwaway code whose only job is to turn the project's two riskiest assumptions into measurements. Do not skip it and do not let it become the real renderer.

```
Read CLAUDE.md, then docs/02-phase-1-mvp.md story P1-US-000, then
section 4.2 of docs/01-tech-stack-and-infrastructure.md.

Build a throwaway spike in /spike. It is not architected, not tested,
and will be deleted. Its only purpose is to answer two questions with
numbers.

1. Can Puppeteer produce a genuinely print-ready PDF?
   - Render one A3 sheet: a placeholder photo plus a January 2027
     calendar grid in Bahasa Indonesia (Januari, Sen–Min, 1 Jan =
     Tahun Baru Masehi, Sundays red).
   - Page size must be exactly 303 x 426 mm (A3 plus 3 mm bleed on
     all sides).
   - Text must stay vector, not raster.
   - Use the SVG-into-HTML-into-page.pdf approach described in
     P1-US-601, not a screenshot.
   - Repeat for A2 single sheet (426 x 600 mm), which is the heaviest
     page in the catalogue.

2. Does it fit in 1 GB of RAM?
   - Provide a Dockerfile and a command that runs the renderer under
     `docker run -m 1g`.
   - Report peak RSS for both A3 and A2 via docker stats.
   - Compare against the budget table in section 4.2.

Deliverables:
- /spike with a README explaining how to run it
- Two PDFs in /spike/out
- A short written report: measured page dimensions, whether text is
  selectable, peak RSS for each format, and whether it fits budget.

Do not build any part of the real application. Do not add Prisma,
Supabase, Next.js, or a queue. When the report is written, stop.
```

**Your job after this session:** open both PDFs in a real PDF reader, confirm the page size and that you can select the text. Then take the A3 file to an actual print shop and have it printed. Look at the colour, the trim, and the sharpness of the small type. If you would not sell that sheet, stop and tell me — the architecture needs rethinking, and this is the cheapest moment to find out.

---

## Session 1 — Foundation

Only start once the spike's exit criteria are met.

```
Read CLAUDE.md and docs/02-phase-1-mvp.md stories P1-US-001 and
P1-US-003.

Build the repository skeleton only. No product features.

Scope:
- Monorepo per section 1.1 of docs/01-tech-stack-and-infrastructure.md
- Docker Compose for web, renderer, redis, caddy. Postgres is remote
  Supabase, not a local container.
- Prisma configured with both DATABASE_URL and DIRECT_URL
- .env.example listing every variable from section 6, each commented
- pnpm dev / test / db:migrate / db:seed all working from a clean
  checkout
- ESLint, Prettier, TypeScript strict, CI failing on type errors
- A CI check that fails if any migration creates a table in the public
  schema without enabling RLS
- Design tokens in Tailwind config, extracted from design/assets/ds.css
  (colours, type scale, spacing, radii). Do not invent new values.

Do not build calendar-core, auth, or any page beyond a health check.
Finish by writing the README setup steps and verifying them yourself
from a clean clone.
```

---

## Session 2 — calendar-core

The most important package in the project. Everything else renders through it.

```
Read CLAUDE.md and docs/02-phase-1-mvp.md story P1-US-002.

Build packages/calendar-core. This package must have zero DOM
dependencies so it runs identically in Node and the browser.

Required:
- buildMonthMatrix(year, month, weekStart)
- resolveHolidays(year, month, holidays)
- Design JSON types with schemaVersion
- renderCalendarGridToFabric(props, scale)
- mmToPx / pxToMm
- Indonesian month and weekday tables, hardcoded, with NO locale
  parameter (see CLAUDE.md, language section)
- fonts.ts as the single font allowlist

Write the tests first: leap-year February, a month starting on Sunday,
Monday vs Sunday week start, and two holidays falling on one date.

Nothing outside this package.
```

---

## Reusable template for every later epic

```
Read CLAUDE.md. Then read docs/02-phase-1-mvp.md, epic <N>, stories
<IDs>.

Implement only those stories. For each one, work through its
acceptance criteria in order and make every checkbox genuinely true.

Before implementing, write tests for any rule tagged BR-* or
RQ-MEM-* that these stories touch.

Match the visual design in design/<relevant>.html. Use the tokens
already in the Tailwind config; do not introduce new colours, sizes,
or spacing values.

When finished:
1. List each acceptance criterion and state whether it passes
2. List what a human reviewer should check by hand
3. Note anything ambiguous you decided, and append an ADR to
   docs/DECISIONS.md

Do not begin the next epic.
```

---

## When something feels wrong

Use this instead of arguing feature by feature. It is far cheaper to catch drift early than to unpick it later.

```
Do not write code this session.

Review the current state of the repository against CLAUDE.md and
docs/02-phase-1-mvp.md. Report:

1. Any non-negotiable in CLAUDE.md that the code violates
2. Any hardcoded value that belongs in settings, product_presets,
   or coin_packages
3. Any acceptance criterion previously reported as done that is not
   actually satisfied
4. Any dependency added without justification
5. Anything built that belongs to Phase 2, 3, or 4

Be specific: file and line. Do not fix anything yet.
```

---

## Notes on working this way

**One epic per session.** With 8 hours a week this is also roughly one session's worth of review capacity, which is not a coincidence. The limit is your ability to check the work, not the agent's ability to produce it.

**Review at the end of every epic, never later.** Letting several epics accumulate unreviewed is the single most common way a month disappears on a project like this.

**When the agent proposes something clever, check `DECISIONS.md` first.** Most of the constraints in this project look like inefficiencies until you know the reason. A warm Chromium pool is faster right up until it takes the website down.

**Keep the spike's report.** When you later wonder whether the 1 GB server was ever a real constraint, that measurement is the answer.
