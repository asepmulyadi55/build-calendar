# CLAUDE.md

Persistent context for this repository. Read this before doing anything else.

## What this is

**BuildCalendar** — a web app where Indonesian users build print-ready calendars from their own photos, preview them, then either export a print-ready PDF (unlocked with prepaid coins) or request a printed copy.

Solo project. One owner who is the only developer, designer, and operator, working ~8 hours a week. Target: live for the 2028 calendar season (Oct–Dec 2027).

## Read these before writing code

| File | What it holds |
|---|---|
| `docs/00-master-spec.md` | Business rules, data model, NFRs, language rules |
| `docs/01-tech-stack-and-infrastructure.md` | Stack, memory budget, Supabase traps |
| `docs/DECISIONS.md` | **Why** things are the way they are. Read this before "improving" anything |
| `docs/02-phase-1-mvp.md` | The user stories you are actually building |
| `design/` | Clickable HTML prototype. `design/assets/ds.css` is the source for design tokens |

`docs/03-`, `04-` and `05-` are future phases. **Do not build from them.** They exist so today's decisions don't block tomorrow's.

## Non-negotiables

These look like things worth optimising. They are not. Each one exists because of a constraint written down in `DECISIONS.md`. Changing any of them without an ADR is a bug, not an improvement.

**Memory — the server is a 1 GB AWS Lightsail box**
- Chromium launches per job and is killed after 60s idle. Never keep a warm browser pool.
- Render one sheet at a time, merge with `pdf-lib`. Never assemble all sheets in memory.
- Resize images with `sharp` to exactly the pixels the slot needs at 300 DPI *before* Chromium sees them.
- BullMQ concurrency is `1`. Do not raise it.

**Language — English app, Indonesian calendar**
- All UI, emails, errors and admin are English, routed through one `en.ts`.
- Everything printed on a calendar sheet is Bahasa Indonesia: `Januari`, `Sen Sel Rab Kam Jum Sab Min`, holiday names verbatim.
- `calendar-core` is hardcoded to `id-ID` with **no locale parameter**. That is deliberate — it makes the split impossible to break from the app side.
- Number formatting stays `id-ID` regardless: `Rp1.250.000`. Week starts Monday.

**Money — the coin ledger is real money**
- `coin_transactions` is append-only. No UPDATE, no DELETE. Corrections are compensating entries.
- Deducting a coin and changing project status happen in ONE database transaction.
- A partial unique index on `(project_id) where reason='unlock'` is what prevents double-spend — not application logic.
- Charge only after the first export job succeeds. Refund automatically if it fails for system reasons.

**Storage and data**
- No images, PDFs, or version snapshots in Postgres. Cloudflare R2 only; the database holds keys.
- Prisma needs both `DATABASE_URL` (pooled, 6543, `?pgbouncer=true`) and `DIRECT_URL` (5432, migrations).
- RLS enabled with deny-all policies on every table in `public`. The server uses the service-role key and bypasses it. The service-role key never appears in client code or a `NEXT_PUBLIC_` variable.

**Rendering**
- One engine. Editor preview, server preview and PDF export all go through `packages/calendar-core`. If the editor can show something the renderer cannot reproduce, that is a blocker-severity bug.
- Fonts ship inside the renderer Docker image. Adding a font to the picker without rebuilding the image is a release blocker.
- No outbound network access during rendering.

**Units**
- All design coordinates are in millimetres. Pixels exist only in the view layer.

## How we work

- **One epic per session.** Finish it, prove it, stop. Do not start the next one.
- A story is done when every acceptance checkbox is genuinely satisfied and rules tagged `BR-*` or `RQ-MEM-*` have tests.
- Write the test for concurrency, ledger and ownership rules **before** the implementation.
- Nothing that belongs in `settings`, `product_presets` or `coin_packages` may be hardcoded.
- Use Prisma migrations. Never change the database by hand or through the Supabase dashboard.
- When a requirement is ambiguous, pick the simplest option that does not block a later phase, then append an ADR to `docs/DECISIONS.md`.
- Code, identifiers and comments in English.

## Scope discipline

Phase 1 only. Specifically **do not** build: print checkout, addresses, shipping rates, payment gateway, the drag-and-drop custom editor, CMYK conversion, coupons, or automated WhatsApp messaging.

Print requests at launch are a WhatsApp deep link (P1-US-105) — about four hours of work. Do not build "a small version" of the Phase 2 checkout. A half-built checkout is worse than an honest manual one.

If you think something outside Phase 1 is needed, say so and stop. Do not build it.

## Commands

```bash
pnpm dev            # web + renderer + redis
pnpm test           # unit + integration
pnpm db:migrate     # prisma migrate dev (uses DIRECT_URL)
pnpm db:seed        # admin user, coin packages, presets, holidays, 3 templates
docker run -m 1g …  # renderer must be tested under a 1 GB cap
```

## Before you say a task is done

- [ ] Every acceptance criterion in the story is actually met, not approximately met
- [ ] Tests exist for the business rules involved and they pass
- [ ] No new hardcoded string, price, or setting
- [ ] No new dependency added without saying why
- [ ] `docs/DECISIONS.md` updated if you made a judgement call
- [ ] You can explain in two sentences what a reviewer should check by hand

<!-- rtk-instructions v2 -->
# RTK (Rust Token Killer) - Token-Optimized Commands

## Golden Rule

**Always prefix commands with `rtk`**. If RTK has a dedicated filter, it uses it. If not, it passes through unchanged. This means RTK is always safe to use.

**Important**: Even in command chains with `&&`, use `rtk`:
```bash
# ❌ Wrong
git add . && git commit -m "msg" && git push

# ✅ Correct
rtk git add . && rtk git commit -m "msg" && rtk git push
```

## RTK Commands by Workflow

### Build & Compile (80-90% savings)
```bash
rtk cargo build         # Cargo build output
rtk cargo check         # Cargo check output
rtk cargo clippy        # Clippy warnings grouped by file (80%)
rtk tsc                 # TypeScript errors grouped by file/code (83%)
rtk lint                # ESLint/Biome violations grouped (84%)
rtk prettier --check    # Files needing format only (70%)
rtk next build          # Next.js build with route metrics (87%)
```

### Test (60-99% savings)
```bash
rtk cargo test          # Cargo test failures only (90%)
rtk go test             # Go test failures only (90%)
rtk jest                # Jest failures only (99.5%)
rtk vitest              # Vitest failures only (99.5%)
rtk playwright test     # Playwright failures only (94%)
rtk pytest              # Python test failures only (90%)
rtk rake test           # Ruby test failures only (90%)
rtk rspec               # RSpec test failures only (60%)
rtk test <cmd>          # Generic test wrapper - failures only
```

### Git (59-80% savings)
```bash
rtk git status          # Compact status
rtk git log             # Compact log (works with all git flags)
rtk git diff            # Compact diff (80%)
rtk git show            # Compact show (80%)
rtk git add             # Ultra-compact confirmations (59%)
rtk git commit          # Ultra-compact confirmations (59%)
rtk git push            # Ultra-compact confirmations
rtk git pull            # Ultra-compact confirmations
rtk git branch          # Compact branch list
rtk git fetch           # Compact fetch
rtk git stash           # Compact stash
rtk git worktree        # Compact worktree
```

Note: Git passthrough works for ALL subcommands, even those not explicitly listed.

### GitHub (26-87% savings)
```bash
rtk gh pr view <num>    # Compact PR view (87%)
rtk gh pr checks        # Compact PR checks (79%)
rtk gh run list         # Compact workflow runs (82%)
rtk gh issue list       # Compact issue list (80%)
rtk gh api              # Compact API responses (26%)
```

### JavaScript/TypeScript Tooling (70-90% savings)
```bash
rtk pnpm list           # Compact dependency tree (70%)
rtk pnpm outdated       # Compact outdated packages (80%)
rtk pnpm install        # Compact install output (90%)
rtk npm run <script>    # Compact npm script output
rtk npx <cmd>           # Compact npx command output
rtk prisma              # Prisma without ASCII art (88%)
```

### Files & Search (60-75% savings)
```bash
rtk ls <path>           # Tree format, compact (65%)
rtk read <file>         # Code reading with filtering (60%)
rtk grep <pattern>      # Search grouped by file (75%). Format flags (-c, -l, -L, -o, -Z) run raw.
rtk find <pattern>      # Find grouped by directory (70%)
```

### Analysis & Debug (70-90% savings)
```bash
rtk err <cmd>           # Filter errors only from any command
rtk log <file>          # Deduplicated logs with counts
rtk json <file>         # JSON structure without values
rtk deps                # Dependency overview
rtk env                 # Environment variables compact
rtk summary <cmd>       # Smart summary of command output
rtk diff                # Ultra-compact diffs
```

### Infrastructure (85% savings)
```bash
rtk docker ps           # Compact container list
rtk docker images       # Compact image list
rtk docker logs <c>     # Deduplicated logs
rtk kubectl get         # Compact resource list
rtk kubectl logs        # Deduplicated pod logs
```

### Network (65-70% savings)
```bash
rtk curl <url>          # Compact HTTP responses (70%)
rtk wget <url>          # Compact download output (65%)
```

### Meta Commands
```bash
rtk gain                # View token savings statistics
rtk gain --history      # View command history with savings
rtk discover            # Analyze Claude Code sessions for missed RTK usage
rtk proxy <cmd>         # Run command without filtering (for debugging)
rtk init                # Add RTK instructions to CLAUDE.md
rtk init --global       # Add RTK to ~/.claude/CLAUDE.md
```

## Token Savings Overview

| Category | Commands | Typical Savings |
|----------|----------|-----------------|
| Tests | vitest, playwright, cargo test | 90-99% |
| Build | next, tsc, lint, prettier | 70-87% |
| Git | status, log, diff, add, commit | 59-80% |
| GitHub | gh pr, gh run, gh issue | 26-87% |
| Package Managers | pnpm, npm, npx | 70-90% |
| Files | ls, read, grep, find | 60-75% |
| Infrastructure | docker, kubectl | 85% |
| Network | curl, wget | 65-70% |

Overall average: **60-90% token reduction** on common development operations.
<!-- /rtk-instructions -->