---
name: calendar-output
description: "Procedure for anything that renders month names, weekday labels, holidays, or the calendar grid, and for any localisation, i18n, locale, or date-formatting work. Trigger whenever code touches calendar-core, holidays, date formatting, or user-facing copy. The app is English but the printed calendar is Indonesian, and the two layers are easy to mix up."
---

# The two language layers

Read `docs/00-master-spec.md` §10.7. The rule in one line: **English chrome, Indonesian output.**

| Layer | Language | Examples |
|---|---|---|
| The application | English | nav, buttons, forms, emails, errors, admin |
| The calendar sheet | Bahasa Indonesia | `Januari`, `Sen Sel Rab Kam Jum Sab Min`, `Tahun Baru Masehi` |

## Rules

- `packages/calendar-core` is **hardcoded to `id-ID` and takes no locale parameter**. This is deliberate: it makes the split impossible to break from the application side. Do not add a locale argument "for flexibility".
- Calendar output strings live in `calendar-core`. Application strings live in `en.ts`. Neither imports from the other.
- `holidays.name` stores the official Indonesian name verbatim. `Hari Raya Nyepi` is never rendered as "Day of Silence". These are legal designations, and translating them makes the calendar factually wrong.
- Number and date formatting stays `id-ID` even though the copy is English: `Rp1.250.000`, not `Rp1,250,000`. The week starts Monday. Do not switch the app to `en-US` formatting because the interface is English.
- **Controls that edit printed content display the printed value.** The editor's month selector reads `Januari`; its label reads "Month". Without this the canvas and the editor disagree, and users file it as a bug.

## Correctness checks

- Sundays render red. National holidays render red with a marker. Joint leave days (*cuti bersama*) are styled distinctly from national holidays.
- The holiday legend prints as `1 Jan — Tahun Baru Masehi`.
- If the selected year has no holiday data, show a clear warning. Never render an empty holiday set silently.
- Verify grid maths against a real calendar. 1 January 2027 falls on a **Friday**.

## Before reporting done

- [ ] No locale parameter was added to `calendar-core`
- [ ] No Indonesian string leaked into `en.ts`, and no English string into calendar output
- [ ] Leap-year February, a month starting on Sunday, and two-holidays-on-one-date all have tests
