# Phase 3 — Custom Editor (Drag & Drop)

> Prerequisite: Phase 1 complete. Phase 2 is not strictly required but is strongly recommended so revenue is already flowing.
> Phase goal: users build calendars from scratch — choose a mode, arrange layout, drag elements, edit text — with no template constraints.
> This is the heaviest phase. Budget two to three times a normal phase.

---

## Definition of Done

- [ ] A user can start from an empty canvas, add images, text, shapes, and calendar grids, position them freely, and export output identical to the preview.
- [ ] Design JSON from the custom editor and from templates share one schema and open interchangeably.
- [ ] Admins can promote any project into a public template.
- [ ] The editor holds ≥ 30 fps with 12 sheets × 20 objects (NFR-F02).
- [ ] No regression in the Phase 1 template flow.

---

## Epic 12 — Canvas & Object Manipulation

### P3-US-1201 · Canvas fundamentals
- [ ] Fabric.js canvas with millimetres as the internal unit (AR-04); display scaled by zoom.
- [ ] Zoom 25%–400% (buttons, Ctrl+scroll, pinch) and panning (space-drag or two-finger drag).
- [ ] Rulers along the top and left edges in cm/mm.
- [ ] Bleed overlay (red) and safe-area overlay (dashed blue), both toggleable.
- [ ] Background grid with optional snapping (off / 5 mm / 10 mm).
- [ ] Smart guides when objects align with each other or with page centrelines.
- [ ] Area outside the trim rendered grey so page boundaries are obvious.

### P3-US-1202 · Object operations
- [ ] Select (click), multi-select (Shift-click, marquee drag).
- [ ] Move, resize (Shift locks aspect ratio), rotate (Shift snaps to 15°).
- [ ] Copy/paste/duplicate (Ctrl+C/V/D), delete (Del).
- [ ] Lock/unlock, hide/show.
- [ ] Layer ordering: bring to front, send to back, forward one, backward one.
- [ ] Alignment: left/centre/right, top/middle/bottom — relative to the page or to the selection.
- [ ] Distribute spacing evenly for three or more objects.
- [ ] Group and ungroup.
- [ ] Numeric properties panel: X, Y, width, height, rotation, opacity — all in mm and directly typeable.
- [ ] Undo/redo covering all of the above, at least 50 steps.

### P3-US-1203 · Layers panel
- [ ] Per-sheet object list with name, type icon, lock and visibility toggles.
- [ ] Reorderable by dragging.
- [ ] Click a name to rename the object.
- [ ] Selection highlights sync in both directions between list and canvas.

---

## Epic 13 — Element Types

### P3-US-1301 · Images
- [ ] Add from the upload gallery or upload directly in the editor.
- [ ] Crop within a frame (mask), including circular and rounded-rectangle frames.
- [ ] Basic filters: brightness, contrast, saturation, greyscale, sepia.
- [ ] Simple drop shadow and border.
- [ ] Live effective-DPI indicator that updates as the object is scaled.

### P3-US-1302 · Text
- [ ] Single-line text and multi-line text blocks.
- [ ] Fonts limited to the curated allowlist (self-hosted, guaranteed present in the renderer). Arbitrary fonts are never permitted.
- [ ] Size in pt, bold/italic/underline, color, alignment, line height, letter spacing.
- [ ] At least 15 fonts covering serif, sans, script, and display.
- [ ] Automatic warning when text falls below 6 pt (unreadable in print).

### P3-US-1303 · Shapes and decoration
- [ ] Rectangle, rounded rectangle, ellipse, line, triangle.
- [ ] Solid fill and simple linear gradient, stroke color, stroke width.
- [ ] Built-in SVG icon and ornament library (license-free, stored locally) with search and recoloring.
- [ ] Page background: solid, gradient, or full-bleed image with a "fill bleed" option.

### P3-US-1304 · The Calendar Grid object
**This is the heart of the product. It must be genuinely configurable.**

- [ ] Add a `calendarGrid` object to any sheet; multiple per sheet allowed (for 2-months-per-sheet and 12-months-per-sheet layouts).
- [ ] Properties: month, year, week start, show/hide month name, show/hide weekday names, weekday format (`Sen` / `Senin` / `S`), show adjacent-month days, show week numbers.
- [ ] All rendered values are Indonesian (master §10.7, Layer 2). Property **labels** in the panel are English; property **values** display exactly as they will print.
- [ ] Styling: font, size, normal text color, Sunday color, national holiday color, *cuti bersama* color, cell background, separator lines (on/off, weight, color), cell spacing.
- [ ] Layout: grid or linear strip.
- [ ] Holiday legend block: on/off, position, format ("1 Jan — Tahun Baru Masehi"). Holiday names render in Indonesian, verbatim.
- [ ] Quick style presets: Minimalis, Klasik, Warna-warni, Elegan.
- [ ] **"Apply this style to all months"** — mandatory. Without it a user must configure twelve grids by hand.
- [ ] The object stays programmatic, so holiday data updates propagate automatically.

---

## Epic 14 — Sheets & Custom Flow

### P3-US-1401 · Mode selection
- [ ] After choosing "Start from scratch", the user picks a product preset (desk / wall 12 / wall 6 / wall single) and a year.
- [ ] The system creates the correct sheets automatically, each with a `calendarGrid` already set to the right month.
- [ ] Starting options: empty canvas, or "start from a skeleton" where grids are already neatly positioned and only photos are missing.

### P3-US-1402 · Sheet management
- [ ] Sheet thumbnail panel: select, reorder by drag, duplicate, delete, add.
- [ ] Deletions and additions validated against preset rules (e.g. `WALL-12` must retain twelve unique month grids — warn otherwise).
- [ ] **"Copy this sheet's design to other sheets"** with a choice of all elements or styling only.
- [ ] The cover sheet is treated as a sheet without a calendar grid.

### P3-US-1403 · Save as a personal template
- [ ] Users can save a project as a personal template for reuse next year.
- [ ] Creating a project from a personal template produces a **new project that still costs coins** (BR-U04). The UI must say this plainly so it never feels like a bait-and-switch.
- [ ] "Roll forward to next year" creates a new project with the same design and every grid's month/year advanced automatically.

### P3-US-1404 · Promoting a project to a public template
- [ ] Admins can take any project — their own, or another user's with written permission — and publish it as a template.
- [ ] A slot-marking tool lets the admin designate which objects become `image`, `text`, or `color` slots; everything else locks.
- [ ] This replaces the Phase 1 manual JSON import flow (P1-US-702); document the migration.

---

## Epic 15 — Editor Quality

### P3-US-1501 · Performance
- [ ] Off-screen rendering deferred; only the active sheet renders fully.
- [ ] Canvas uses preview-resolution images; print resolution is loaded only at export.
- [ ] Debounced autosave with differential saves (send the delta, not the whole JSON, once it exceeds 500 KB).
- [ ] A persistent "Saving… / Saved / Couldn't save" indicator. Failures offer retry and block tab close via `beforeunload`.

### P3-US-1502 · Recovery and data safety
- [ ] Automatic version history: snapshot every 20 changes or 10 minutes, keeping the last 10 versions. **Snapshots are stored in R2, never in Postgres** (AR-07).
- [ ] A version history page allowing preview and restore.
- [ ] Local draft copy in IndexedDB as a safety net for network loss, synced on reconnect.

### P3-US-1503 · Usability
- [ ] A five-step onboarding tour on first entry to the custom editor, skippable.
- [ ] Keyboard shortcut reference opened with `?`.
- [ ] Right-click context menu on objects.
- [ ] Helpful empty state on a blank canvas ("Drag a photo here, or add an element from the left panel").
- [ ] Plain English throughout, written for readers whose first language is not English: short sentences, concrete verbs, no idioms. "Bring to front", not "Promote layer".

---

## Critical Technical Notes

1. **Do not write a second rendering engine.** Editor and renderer must use the same `calendar-core` and the same Fabric version. If the editor can display something the renderer cannot reproduce, that is a blocker-severity bug.
2. **Constrain fonts and filters** to what headless Chromium provably renders. Every new font requires a renderer image rebuild in the same change (`01-…` §5.5).
3. **Keep the JSON schema backward compatible.** Phase 1 projects must still open. Ship a migrator and a test that loads fixtures of old projects.
4. **Cap Design JSON size** (e.g. 2 MB) and objects per sheet (e.g. 60), to prevent projects that cannot be rendered — and to protect the database quota.
5. **Sanitize SVGs** from uploads and the icon library: strip `<script>`, event handlers, and external references.

## Out of Scope for Phase 3

Real-time multi-user collaboration, animation, AI background removal, automatic layout generation, a full editor on phone-sized screens.
