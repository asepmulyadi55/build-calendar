# Delivery Plan

Companion to `00-master-spec.md`. Sequence, checkpoints and dates.
The same plan with diagrams is in `design/project-plan.html` — open it in a browser.

Derived from **8 hours per week, one person doing everything** (ADR-0007). Every date below comes from that number and nothing else. If capacity changes materially, revisit ADR-0007 first, then this file.

---

## 1. The deadline that isn't ours to move

Indonesians buy next year's calendar between **October and December**. That is the only window that matters.

|                                    |                                  |
| ---------------------------------- | -------------------------------- |
| Phase 1 effort                     | ~320 hours                       |
| Template design (owner, 3 designs) | ~20 hours                        |
| Available                          | 8 hours/week                     |
| **Duration**                       | **~42 weeks — about ten months** |

Selling 2027 calendars would need the site live by mid-October 2026. Even cutting to desk calendars only, three designs, and no admin panel lands in January 2027 — after the window closes.

**So the 2027 season is out of reach, and the target is the 2028 season: October–December 2027.** This is decided by arithmetic, not preference.

That is the better outcome. A frantic eight-week scramble becomes a calm year: Phase 1 built properly, real users in a quiet month, and a first real season with a product worth trusting.

---

## 2. Process

Requirements were worth doing once, up front, for the whole product. Design, build and deploy are not — each phase runs its own loop.

```
ONCE:     Requirements ──▶ Spike ──▶ Design
            (done)      (gate)    (done)

PER PHASE: Build ──▶ Review ──▶ Staging ──▶ Security ──▶ 5 users ──▶ Production
             ▲                                                          │
             └──────────────────────────────────────────────────────────┘
                  next phase starts from what real users did

ALONGSIDE (not developer work):
  Template design · QRIS merchant · Print vendor · Legal copy + holidays
```

Two things this says that a standard waterfall chart does not:

- **The spike comes before design work continues**, because its result can invalidate the architecture. Finding that out in month four is expensive; in week one it costs a printed sheet.
- **The dashed track along the bottom is not developer work**, and it is where this kind of project actually slips. Templates and QRIS registration have lead times outside your control.

---

## 3. Timeline

| Month            | Development                                            | Running alongside                                    |
| ---------------- | ------------------------------------------------------ | ---------------------------------------------------- |
| **Sep 2026**     | Spike (3 days) → foundation, `calendar-core` begins    | Print vendor sourcing · **QRIS registration starts** |
| **Oct 2026**     | Foundation + `calendar-core`                           | Template design begins · QRIS                        |
| **Nov 2026**     | `calendar-core` complete                               | Template design · QRIS                               |
| **Dec 2026**     | Auth and accounts                                      | Template design                                      |
| **Jan 2027**     | Templates, editor, uploads                             | Template design                                      |
| **Feb 2027**     | Templates, editor, uploads                             | **3 templates finished**                             |
| **Mar 2027**     | Renderer                                               |                                                      |
| **Apr 2027**     | Renderer + preview                                     |                                                      |
| **May 2027**     | Preview + print-readiness checks                       |                                                      |
| **Jun 2027**     | Coins, payments, unlock                                | Legal copy · holiday data                            |
| **Jul 2027**     | Export + minimal admin                                 | Legal copy · holiday data                            |
| **Aug 2027**     | Security pass, backups, ops readiness, **5-user test** | Holiday data for 2028                                |
| **Sep 2027**     | **Soft launch** — quiet month, real money              | Marketing pages, SEO                                 |
| **Oct–Dec 2027** | **Season — sell**                                      | Support, print requests by WhatsApp                  |

Phase 2 (print checkout) is built in the 2028 quiet season, and only if WhatsApp click data justifies it. Phase 3 (custom editor) is roughly 12 weeks and belongs between January and August 2028.

---

## 4. Checkpoints that matter more than dates

**End of September 2026 — the spike gate.** A printed A3 sheet you would be willing to sell, and a peak-RSS measurement that fits 1 GB. If either fails, stop and rethink the architecture. This is the cheapest moment it will ever be.

**End of February 2027 — three finished templates.** If they don't exist, the editor has nothing to edit and everything after this slips. This is the checkpoint most at risk, because it is design work competing with development work for the same 8 hours.

**End of August 2027 — five people who are not you.** Each makes a calendar unaided while you watch in silence and give no help. This is the checkpoint solo builders skip, and the one that best predicts whether anyone buys.

---

## 5. Where this actually fails

Not on difficulty. On these:

**Momentum.** Months four to seven are the renderer — invisible plumbing with nothing to show. Finish something visible every month so progress stays legible to the person doing it.

**Templates.** Three good designs is real design work by the same person writing the code. Protect the hours or the date slips.

**Scope creep from your own ideas.** Everything new goes on a list for Phase 4, never into Phase 1. The spec is the defence; use it.

**Review debt.** Letting the agent run several epics unreviewed is how a month disappears. Run `/finish-epic` at the end of each one, and `/audit-drift` every few.

**Ten months without a customer.** The real risk of a calm timeline is that nobody tells you you're wrong until month ten. The five-user test is the mitigation, and it is not optional.

---

## 6. Start now, not in September

Both have lead times outside your control:

- **QRIS merchant registration** — requires business documents and can take weeks
- **A print vendor** — needed for the spike gate, not just for Phase 2
