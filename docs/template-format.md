# Template file format

How to author a calendar template and import it, until Phase 3 gives us a visual editor.

A template is one **Design JSON** file plus an optional thumbnail image. You write the JSON, drop it into the admin panel at `/admin/templates/new`, and the panel validates it against the product preset before storing anything. A template that fails validation is rejected with every problem listed — nothing partial is ever saved.

Templates arrive **inactive**. Preview it on the template page, then activate it. Only active templates appear in the public gallery.

---

## The shape

```jsonc
{
  "schemaVersion": 1,
  "productPresetCode": "WALL-12",
  "year": 2027,
  "startMonth": 1,
  "sheets": [ /* one entry per sheet — see below */ ]
}
```

| Field | Meaning |
|---|---|
| `schemaVersion` | Always `1` today. Old templates keep working when this changes (AR-06) |
| `productPresetCode` | Must equal the `code` of the preset you import it against |
| `year` | The calendar year the design was authored for |
| `startMonth` | 1–12. Calendars may start at a month other than January |
| `sheets` | Exactly as many entries as the preset's `sheet_count` |

### A sheet

```jsonc
{
  "id": "sheet-01",
  "index": 0,
  "widthMm": 297,
  "heightMm": 420,
  "bleedMm": 3,
  "safeMarginMm": 10,
  "objects": [ /* calendarGrid, text */ ],
  "slots": [ /* what the user fills in */ ]
}
```

`widthMm` and `heightMm` are the **trim** size and must match the preset exactly. Bleed is added outside them on all four sides, so the exported page is `widthMm + bleedMm × 2` wide.

**Every coordinate in the file is millimetres** (AR-04). There are no pixels anywhere. The origin is the top-left corner of the bleed area, so a full-bleed photo starts at `0,0` and is `widthMm + bleedMm × 2` wide.

### A slot

Slots are what the editor asks the user to fill.

```jsonc
{
  "id": "photo-1",
  "type": "image",
  "required": true,
  "label": "Photo for sheet 1",
  "xMm": 0,
  "yMm": 0,
  "widthMm": 303,
  "heightMm": 249.2
}
```

`id` must be **unique across the whole design**, not just within a sheet. The id is how a user's uploaded photo is addressed, so two slots sharing one means the second photo silently overwrites the first. The validator rejects this.

`type` is `image` or `text`. Text slots may carry `maxLength`.

### A calendar grid

The grid is a programmatic object, never an image (AR-03). It is drawn by `calendar-core` at export time, which is what guarantees the preview and the PDF agree.

```jsonc
{
  "type": "calendarGrid",
  "id": "grid-1",
  "month": 1,
  "year": 2027,
  "weekStart": "monday",
  "locale": "id-ID",
  "showHolidayNames": true,
  "showWeekNumbers": false,
  "holidayColor": "#D8232A",
  "fontFamily": "DejaVu Sans",
  "cellStyle": { "textColor": "#16171B", "mutedColor": "#B6B8BE", "ruleColor": "#DCDBD4",
                 "dayFontSizeMm": 4.5, "headerFontSizeMm": 2.6, "holidayNameFontSizeMm": 1.6 },
  "xMm": 13, "yMm": 281, "widthMm": 277, "heightMm": 132
}
```

`locale` is `id-ID` and nothing else. The printed sheet is Bahasa Indonesia — month names, weekday labels and holiday names — while the interface around it stays English (master spec §10.7). The validator rejects any other value.

`fontFamily` must be on the allowlist in `packages/calendar-core/src/fonts.ts`, which lists exactly the fonts installed in the renderer Docker image. A font that is not there does not fail loudly: Chromium substitutes a default and the exported PDF stops matching the preview, which a user discovers only after paying (§5.5).

---

## What the importer checks

Every one of these rejects the file, and all problems are reported at once:

| Check | Why |
|---|---|
| `schemaVersion` is one this build understands | A file with no version can never be migrated |
| `productPresetCode` matches the preset you chose | Importing an A2 design as an A3 would export at the wrong size |
| Sheet count equals the preset's `sheet_count` | A 12-sheet preset with 11 sheets is a missing month |
| Every sheet's trim size equals the preset's | No print shop will catch this for us |
| Slot ids are present, non-empty, and unique | Duplicates overwrite a user's photo |
| At least one slot exists | Otherwise there is nothing for a user to fill |
| Every `fontFamily` is on the allowlist | Silent substitution breaks WYSIWYG (AR-01) |
| Calendar grid `month` is 1–12 | |
| Calendar grid `locale` is `id-ID` | The printed sheet is Indonesian |

The `slot_schema` stored on the template row is **derived** from the design during import. You do not write it by hand and it cannot drift.

---

## Thumbnails

JPEG, PNG or WebP, up to 2 MB. The file type is checked by its magic bytes, not its extension (NFR-S03).

Thumbnails live in the private R2 bucket alongside customer photos and are served through an admin route, never a public URL (NFR-S04).

---

## The three launch templates

They live in `packages/db/templates/` and are regenerated with:

```bash
pnpm --filter @buildcalendar/db templates
```

Three, not six — the owner designs these alone and three is the launch target (ADR-0007).

`pnpm db:seed` validates each file against its preset and creates the template row with the derived slot schema. The rows are **inactive** and their `design_key` points at an object that does not exist until you import the file through the admin panel, which is what uploads it to R2. Seeding does not touch object storage.

---

## Where the files end up

| What | Where |
|---|---|
| Design JSON | `templates/{slug}/design.json` in R2 |
| Thumbnail | `templates/{slug}/thumbnail.{ext}` in R2 |
| Row | `templates` table — holds the keys, never the file (AR-07) |

Deleting a template removes the row and both objects. A calendar somebody already built from it is unaffected: selecting a template **copies** its Design JSON into the project, so a later change to the template never alters an existing calendar.
