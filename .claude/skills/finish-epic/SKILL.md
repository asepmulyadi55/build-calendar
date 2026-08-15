---
name: finish-epic
description: "Run at the end of an epic, before reporting it complete. Verifies acceptance criteria are genuinely met, checks the non-negotiables, and produces the handover note the owner reviews. Invoke with /finish-epic."
---

# Closing out an epic

Write no new features in this pass. Verify, then report.

## 1. Walk the acceptance criteria

Open the epic in `docs/02-phase-1-mvp.md`. For every checkbox, state one of:

- **Pass** — and name the file or test that proves it
- **Partial** — and say exactly what is missing
- **Not done** — and say why

"Approximately met" counts as partial. Be strict: the owner has 8 hours a week and cannot re-verify your work from scratch.

## 2. Check the non-negotiables

Re-read the relevant section of `CLAUDE.md` and confirm the diff violates none of it. Pay particular attention to anything that would have looked like a sensible optimisation: a warm browser pool, raised concurrency, a locale parameter, a cached balance read on a write path, a table without RLS.

## 3. Check for drift

- Any hardcoded value that belongs in `settings`, `product_presets` or `coin_packages`?
- Any new dependency? Name it and justify it in one sentence.
- Anything built that belongs to Phase 2, 3 or 4?

## 4. Tests

Confirm tests exist and pass for every `BR-*` and `RQ-MEM-*` rule the epic touched. If a rule has no test, say so plainly rather than calling the epic done.

## 5. Write the handover

Produce, in this order:

1. One paragraph: what now works that did not before
2. The acceptance criteria table from step 1
3. **What the owner should check by hand** — specific, three to five items, things automation cannot confirm
4. Any judgement call you made, appended as an ADR to `docs/DECISIONS.md`
5. What the next epic is, and nothing more about it

Then stop. Do not begin the next epic.
