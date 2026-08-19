import { describe, expect, it } from 'vitest';
import { buildSheetHtml, pageSizeMm, mmToPt } from './html';

/**
 * Page geometry (P1-US-601) and the "vector, offline, exact size" contract the
 * spike verified.
 *
 * The seeded product presets, as `packages/db/src/seed.ts` defines them. Page size
 * is trim plus bleed on every side — AR-04 — so it is never the trim size, and a
 * printer that trims to the trim line needs the bleed to actually be there.
 */
const PRESETS = [
  { code: 'DESK-A5L', widthMm: 210, heightMm: 148, bleedMm: 3 },
  { code: 'DESK-SQ', widthMm: 150, heightMm: 150, bleedMm: 3 },
  { code: 'WALL-12', widthMm: 297, heightMm: 420, bleedMm: 3 },
  { code: 'WALL-6', widthMm: 297, heightMm: 420, bleedMm: 3 },
  { code: 'WALL-1', widthMm: 420, heightMm: 594, bleedMm: 3 },
];

describe('pageSizeMm', () => {
  it.each(PRESETS)('$code is trim plus bleed on both axes', (preset) => {
    const page = pageSizeMm(preset);

    expect(page.widthMm).toBe(preset.widthMm + preset.bleedMm * 2);
    expect(page.heightMm).toBe(preset.heightMm + preset.bleedMm * 2);
  });

  it('gives the A2 single sheet the 426 × 600 mm the spike measured', () => {
    expect(pageSizeMm({ widthMm: 420, heightMm: 594, bleedMm: 3 })).toEqual({
      widthMm: 426,
      heightMm: 600,
    });
  });
});

describe('mmToPt', () => {
  it.each(PRESETS)('$code converts within the 0.5 mm tolerance P1-US-603 sets', (preset) => {
    const page = pageSizeMm(preset);

    // Round-trip through points, which is the unit the PDF MediaBox is written in.
    for (const mm of [page.widthMm, page.heightMm]) {
      expect(Math.abs((mmToPt(mm) / 72) * 25.4 - mm)).toBeLessThan(0.5);
    }
  });
});

describe('buildSheetHtml', () => {
  const sheet = {
    widthMm: 420,
    heightMm: 594,
    bleedMm: 3,
    svg: '<svg xmlns="http://www.w3.org/2000/svg"><text>Januari</text></svg>',
  };

  it('sets @page to the exact page size in millimetres with no margin', () => {
    const html = buildSheetHtml(sheet);

    // `preferCSSPageSize: true` makes this the MediaBox. A margin here would shrink
    // the printable area and silently crop the bleed.
    expect(html).toContain('@page');
    expect(html).toMatch(/size:\s*426mm\s+600mm/);
    expect(html).toMatch(/margin:\s*0/);
  });

  it('embeds the SVG rather than linking it', () => {
    expect(buildSheetHtml(sheet)).toContain('<text>Januari</text>');
  });

  it('resolves every reference locally — nothing is fetched at render time', () => {
    const html = buildSheetHtml({
      ...sheet,
      svg:
        '<svg xmlns="http://www.w3.org/2000/svg">' +
        '<image href="file:///tmp/photo-1.jpg"/><text>Januari</text></svg>',
    });

    // `xmlns` is a namespace identifier, never requested, so it is excluded on
    // purpose. Everything Chromium would actually resolve is checked.
    const references = [...html.matchAll(/(?:href|src|xlink:href)="([^"]*)"/g)].map((m) => m[1]!);

    expect(references).toContain('file:///tmp/photo-1.jpg');
    for (const reference of references) {
      expect(reference.startsWith('file://') || reference.startsWith('#')).toBe(true);
    }

    // No stylesheet, script, or font pulled from a host.
    expect(html).not.toContain('fonts.googleapis.com');
    expect(html).not.toMatch(/<(?:link|script)[\s>]/);
  });

  it('declares the print colour scheme so backgrounds are not dropped', () => {
    expect(buildSheetHtml(sheet)).toContain('print-color-adjust');
  });
});
