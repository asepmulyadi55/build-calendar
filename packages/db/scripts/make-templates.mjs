/**
 * Generates the three launch templates as Design JSON files.
 *
 * They are authoring artifacts, not runtime code: the admin uploads them through
 * the panel (P1-US-702), which validates them and stores the JSON in R2. Keeping
 * them in the repository means the launch templates are versioned and can be
 * regenerated when the schema changes.
 *
 * Three, not six — the owner designs these alone (ADR-0007).
 *
 *   pnpm --filter @buildcalendar/db templates
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CURRENT_SCHEMA_VERSION,
  DEFAULT_CELL_STYLE,
  createCalendarGridObject,
} from '@buildcalendar/calendar-core';

const here = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(here, '..', 'templates');
const YEAR = 2027;

/** Full-bleed photo on top, calendar grid below — the layout the spike proved. */
function photoAboveGrid({ preset, sheetIndex, month, slotId }) {
  const pageWidth = preset.widthMm + preset.bleedMm * 2;
  const pageHeight = preset.heightMm + preset.bleedMm * 2;
  const photoHeight = Math.round(pageHeight * 0.585 * 10) / 10;
  const margin = preset.bleedMm + preset.safeMarginMm;
  const gridTop = photoHeight + 32;

  return {
    id: `sheet-${String(sheetIndex + 1).padStart(2, '0')}`,
    index: sheetIndex,
    widthMm: preset.widthMm,
    heightMm: preset.heightMm,
    bleedMm: preset.bleedMm,
    safeMarginMm: preset.safeMarginMm,
    objects: [
      createCalendarGridObject({
        id: `grid-${sheetIndex + 1}`,
        month,
        year: YEAR,
        xMm: margin,
        yMm: gridTop,
        widthMm: pageWidth - margin * 2,
        heightMm: pageHeight - gridTop - margin,
        cellStyle: DEFAULT_CELL_STYLE,
      }),
    ],
    slots: [
      {
        id: slotId,
        type: 'image',
        required: true,
        label: `Photo for sheet ${sheetIndex + 1}`,
        xMm: 0,
        yMm: 0,
        widthMm: pageWidth,
        heightMm: photoHeight,
      },
    ],
  };
}

const PRESETS = {
  'WALL-12': {
    code: 'WALL-12',
    widthMm: 297,
    heightMm: 420,
    bleedMm: 3,
    safeMarginMm: 10,
    sheetCount: 12,
  },
  'DESK-A5L': {
    code: 'DESK-A5L',
    widthMm: 210,
    heightMm: 148,
    bleedMm: 3,
    safeMarginMm: 7,
    sheetCount: 13,
  },
  'WALL-1': {
    code: 'WALL-1',
    widthMm: 420,
    heightMm: 594,
    bleedMm: 3,
    safeMarginMm: 12,
    sheetCount: 1,
  },
};

const TEMPLATES = [
  { slug: 'kayu', presetCode: 'WALL-12' },
  { slug: 'pesisir', presetCode: 'DESK-A5L' },
  { slug: 'batik-modern', presetCode: 'WALL-1' },
];

mkdirSync(OUT, { recursive: true });

for (const template of TEMPLATES) {
  const preset = PRESETS[template.presetCode];
  const sheets = [];

  for (let index = 0; index < preset.sheetCount; index++) {
    // A 13-sheet desk calendar is a cover plus twelve months. The cover carries
    // January's grid so every sheet is still a usable calendar page.
    const isCover = preset.sheetCount === 13 && index === 0;
    const month = isCover ? 1 : ((preset.sheetCount === 13 ? index - 1 : index) % 12) + 1;

    sheets.push(
      photoAboveGrid({
        preset,
        sheetIndex: index,
        month,
        slotId: isCover ? 'photo-cover' : `photo-${month}`,
      }),
    );
  }

  const design = {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    productPresetCode: preset.code,
    year: YEAR,
    startMonth: 1,
    sheets,
  };

  const file = path.join(OUT, `${template.slug}.json`);
  writeFileSync(file, `${JSON.stringify(design, null, 2)}\n`, 'utf8');
  console.log(
    `${template.slug.padEnd(14)} ${preset.code.padEnd(9)} ${String(sheets.length).padStart(2)} sheets -> templates/${template.slug}.json`,
  );
}
