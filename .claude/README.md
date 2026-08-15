# .claude

Configuration Claude Code loads for this repository.

## What is where, and why

| Mechanism | Loaded | Holds |
|---|---|---|
| `../CLAUDE.md` | Every session, always | Short, always-true project rules |
| `skills/*/SKILL.md` | On demand, when the description matches the task | Procedures for one risky area |

Splitting them matters. If every rule lived in `CLAUDE.md` the file would grow past the point where its middle gets skimmed. A skill enters context only when the work actually touches that area, so the rule arrives at the moment it applies.

## The skills

Five load automatically when the work matches. Two you invoke yourself.

| Skill | Fires when |
|---|---|
| `coin-ledger` | Anything touching coins, payments, verification, or unlocking |
| `renderer-memory` | Anything touching the renderer, Chromium, PDF export, or the queue |
| `calendar-output` | Anything rendering months, weekdays, holidays, or date formats |
| `db-and-rls` | Schema changes, migrations, RLS, connection strings |
| `build-ui` | Any page, component, form, or styling work |
| `/finish-epic` | You run it at the end of every epic |
| `/audit-drift` | You run it when something feels off, or every few epics |

## Adding a skill

Create `skills/<name>/SKILL.md` with `name` and `description` frontmatter. The directory name becomes the slash command. **The description is what decides whether the skill loads automatically**, so name the trigger conditions concretely — the file names, the table names, the words a task would use. A vague description means the skill never fires.

Keep skills procedural. Steps to follow, not background reading. Reference material belongs in `docs/`; a skill points at it.

## When a skill and CLAUDE.md disagree

They should not. If they do, `CLAUDE.md` wins and the skill is wrong — fix the skill and note it in `docs/DECISIONS.md`.
