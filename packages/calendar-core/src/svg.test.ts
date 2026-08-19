import { describe, expect, it } from 'vitest';
import { renderSheetToSvg } from './svg.js';
import { createCalendarGridObject } from './design.js';
import type { Holiday } from './holidays.js';
import type { Sheet } from './design.js';

/**
 * Sheet to SVG (P1-US-601).
 *
 * This is the vector path: `calendar-core` builds the scene, the renderer wraps
 * the SVG in a page and lets Chromium write the PDF. Text stays text, so it stays
 * selectable and embeds as a font subset rather than as pixels.
 *
 * It lives here rather than in the renderer because AR-01 allows exactly one
 * engine. The editor draws from the same objects.
 */
const holidays: Holiday[] = [
  { date: '2027-01-01', name: 'Tahun Baru Masehi', type: 'national', year: 2027, isRedDate: true },
];

const sheet: Sheet = {
  id: 'sheet-01',
  index: 0,
  widthMm: 297,
  heightMm: 420,
  bleedMm: 3,
  safeMarginMm: 10,
  slots: [
    {
      id: 'photo-1',
      type: 'image',
      required: true,
      xMm: 0,
      yMm: 0,
      widthMm: 303,
      heightMm: 240,
    },
  ],
  objects: [
    {
      type: 'imageSlot',
      id: 'img-1',
      slotId: 'photo-1',
      xMm: 0,
      yMm: 0,
      widthMm: 303,
      heightMm: 240,
    },
    createCalendarGridObject({
      id: 'grid-1',
      month: 1,
      year: 2027,
      xMm: 10,
      yMm: 260,
      widthMm: 277,
      heightMm: 140,
    }),
    {
      type: 'text',
      id: 'caption-1',
      text: 'Keluarga Wijaya',
      fontFamily: 'DejaVu Sans',
      fontSizeMm: 6,
      fill: '#1a1a1a',
      xMm: 10,
      yMm: 410,
      widthMm: 277,
      heightMm: 8,
    },
  ],
};

const render = (
  overrides: Parameters<typeof renderSheetToSvg>[0] extends never
    ? never
    : Partial<Parameters<typeof renderSheetToSvg>[0]> = {},
) => renderSheetToSvg({ sheet, holidays, images: {}, ...overrides });

describe('renderSheetToSvg', () => {
  it('spans the full page — trim plus bleed on every side', () => {
    const svg = render();

    // The origin is the bleed corner, so a full-bleed photo at xMm 0 starts outside
    // the trim line, which is the whole point of bleed.
    expect(svg).toContain('width="303mm"');
    expect(svg).toContain('height="426mm"');
    expect(svg).toContain('viewBox="0 0 303 426"');
  });

  it('emits the calendar grid as text, not as an image', () => {
    const svg = render();

    expect(svg).toContain('<text');
    expect(svg).not.toContain('<image');
    // Printed output is Indonesian, whatever language the interface is in.
    expect(svg).toContain('Sen');
    expect(svg).toContain('Min');
  });

  it('places an image slot only when a photo was supplied for it', () => {
    expect(render()).not.toContain('<image');

    const filled = render({ images: { 'photo-1': { href: 'file:///tmp/p.jpg' } } });
    expect(filled).toContain('<image');
    expect(filled).toContain('file:///tmp/p.jpg');
  });

  it('clips a photo to its slot, so a cover-fitted image cannot bleed into the grid', () => {
    const filled = render({ images: { 'photo-1': { href: 'file:///tmp/p.jpg' } } });

    expect(filled).toContain('clipPath');
    expect(filled).toMatch(/clip-path="url\(#/);
  });

  it('escapes text so a caption cannot inject markup', () => {
    const hostile: Sheet = {
      ...sheet,
      objects: [
        {
          type: 'text',
          id: 'caption-1',
          text: '</text><script>alert(1)</script>',
          fontFamily: 'DejaVu Sans',
          fontSizeMm: 6,
          fill: '#1a1a1a',
          xMm: 10,
          yMm: 410,
          widthMm: 277,
          heightMm: 8,
        },
      ],
    };

    const svg = renderSheetToSvg({ sheet: hostile, holidays, images: {} });

    expect(svg).not.toContain('<script>');
    expect(svg).toContain('&lt;script&gt;');
  });

  it('rejects a font that is not on the allowlist rather than letting Chromium substitute', () => {
    const unlisted: Sheet = {
      ...sheet,
      objects: [
        {
          type: 'text',
          id: 'caption-1',
          text: 'Halo',
          fontFamily: 'Comic Sans MS',
          fontSizeMm: 6,
          fill: '#1a1a1a',
          xMm: 10,
          yMm: 410,
          widthMm: 277,
          heightMm: 8,
        },
      ],
    };

    // A font not in the image is a silent substitution at print time, which is
    // exactly the kind of defect nobody sees until the box arrives.
    expect(() => renderSheetToSvg({ sheet: unlisted, holidays, images: {} })).toThrow(
      /Comic Sans MS/,
    );
  });

  it('draws crop marks in the bleed area only when asked', () => {
    expect(render()).not.toContain('id="crop-marks"');

    const marked = render({ cropMarks: true });
    expect(marked).toContain('id="crop-marks"');
  });

  it('keeps crop marks outside the trim box', () => {
    const marked = render({ cropMarks: true });
    const block = marked.slice(marked.indexOf('id="crop-marks"'));

    // A mark drawn inside the trim would print on the finished calendar.
    expect(block).toContain('<line');
  });

  it('references no external resource — nothing is fetched at render time', () => {
    const svg = render({ images: { 'photo-1': { href: 'file:///tmp/p.jpg' } } });

    // `xmlns` is a namespace identifier and is never requested, so it is excluded
    // deliberately. Every attribute that Chromium would actually resolve is checked.
    const references = [...svg.matchAll(/(?:href|src|xlink:href)="([^"]*)"/g)].map((m) => m[1]!);

    expect(references.length).toBeGreaterThan(0);
    for (const reference of references) {
      expect(reference.startsWith('file://') || reference.startsWith('#')).toBe(true);
    }
  });
});
