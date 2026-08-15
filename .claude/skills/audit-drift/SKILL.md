---
name: audit-drift
description: "Read-only review of the repository against CLAUDE.md and the Phase 1 spec. Use when something feels wrong, before a long break, or every few epics as a routine check. Reports violations without fixing them. Invoke with /audit-drift."
---

# Drift audit

**Write no code in this session.** Fixing things during an audit hides how much drifted.

Read `CLAUDE.md`, `docs/02-phase-1-mvp.md`, and `docs/DECISIONS.md`. Then report, with file and line for each finding:

## 1. Violated non-negotiables

Anything in the `CLAUDE.md` non-negotiables list the code no longer honours. Check specifically for:

- A warm Chromium pool, or concurrency above 1
- A locale parameter on `calendar-core`, or Indonesian strings in `en.ts`
- UPDATE or DELETE against `coin_transactions`
- A table in `public` without RLS
- Service-role key reachable from client code
- Blobs stored in Postgres rather than R2
- Design coordinates in pixels rather than millimetres

## 2. Hardcoded configuration

Values that belong in `settings`, `product_presets` or `coin_packages` but appear as literals in code.

## 3. Overclaimed completeness

Acceptance criteria previously reported as done that are not actually satisfied. This is the most valuable section — check it properly rather than trusting earlier reports.

## 4. Unjustified dependencies

Packages in `package.json` that no ADR or story explains.

## 5. Out-of-phase work

Anything belonging to Phase 2, 3 or 4: print checkout, address forms, shipping rates, payment gateway, drag-and-drop editor, CMYK, coupons.

## Output

A numbered list ordered by severity, each with file, line, and a one-sentence description of the risk. End with a single recommendation: what to fix first. Then stop.
