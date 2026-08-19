/**
 * A sheet, as SVG (P1-US-601).
 *
 * The renderer wraps this in an HTML page whose `@page` size is the sheet's trim
 * plus bleed, and lets Chromium write the PDF. Because everything here is real SVG
 * — `<text>` for text, `<line>` and `<rect>` for rules — Skia emits vector text and
 * embedded font subsets rather than a rasterised page. That is what makes a 1 GB
 * box viable at all (`01-…` §4.2): no 300 DPI framebuffer is ever allocated.
 *
 * One user unit is one millimetre, matching the rest of the codebase. Pixels exist
 * only in the view layer, and there is no view layer here.
 *
 * This lives in `calendar-core` rather than the renderer because AR-01 allows one
 * engine: the editor and the export must draw from the same objects.
 */
import { isAllowedFontFamily } from './fonts.js';
import { renderCalendarGridToFabric, type FabricObject } from './fabric-grid.js';
import type { Holiday } from './holidays.js';
import type { Sheet } from './design.js';

/** A photo already pre-sized by the renderer, addressed by `file://`. */
export interface SheetImage {
  readonly href: string;
  /** Fractions of the slot, matching the editor's crop controls. */
  readonly panX?: number;
  readonly panY?: number;
  readonly zoom?: number;
  readonly rotation?: number;
}

export interface RenderSheetOptions {
  readonly sheet: Sheet;
  readonly holidays: readonly Holiday[];
  /** Keyed by `slotId`. A slot with no entry renders empty rather than broken. */
  readonly images: Readonly<Record<string, SheetImage>>;
  /** Registration marks in the bleed area. Off unless the export asks for them. */
  readonly cropMarks?: boolean;
}

/** Length of a crop mark, in millimetres. */
const CROP_MARK_MM = 4;
/** Gap between the trim corner and the start of a mark, so it never touches. */
const CROP_MARK_GAP_MM = 1;
const CROP_MARK_WEIGHT_MM = 0.25;

const round = (value: number): number => Math.round(value * 1000) / 1000;

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * A font missing from the renderer image is substituted silently by Chromium, and
 * nobody finds out until the printed calendar arrives. Fail the job instead — the
 * allowlist and the Docker image are kept in step by `requiredDebianPackages()`.
 */
function assertFontAllowed(family: string): void {
  if (!isAllowedFontFamily(family)) {
    throw new Error(
      `font "${family}" is not in the allowlist and does not ship in the renderer image`,
    );
  }
}

/** Fabric's origin conventions, expressed as SVG anchors. */
function textAnchor(originX: 'left' | 'center' | 'right'): string {
  if (originX === 'center') return 'middle';
  if (originX === 'right') return 'end';
  return 'start';
}

function baseline(originY: 'top' | 'center' | 'bottom'): string {
  if (originY === 'center') return 'central';
  if (originY === 'bottom') return 'text-after-edge';
  return 'text-before-edge';
}

function fabricObjectToSvg(object: FabricObject): string {
  switch (object.type) {
    case 'Text': {
      assertFontAllowed(object.fontFamily);
      return (
        `<text x="${round(object.left)}" y="${round(object.top)}" ` +
        `font-family="${escapeXml(object.fontFamily)}" font-size="${round(object.fontSize)}" ` +
        `font-weight="${object.fontWeight}" fill="${escapeXml(object.fill)}" ` +
        `text-anchor="${textAnchor(object.originX)}" ` +
        `dominant-baseline="${baseline(object.originY)}"` +
        `>${escapeXml(object.text)}</text>`
      );
    }

    case 'Line':
      return (
        `<line x1="${round(object.x1)}" y1="${round(object.y1)}" ` +
        `x2="${round(object.x2)}" y2="${round(object.y2)}" ` +
        `stroke="${escapeXml(object.stroke)}" stroke-width="${round(object.strokeWidth)}"/>`
      );

    case 'Rect': {
      // Fabric centres a Rect on its origin; SVG measures from the top-left corner.
      const x = object.originX === 'center' ? object.left - object.width / 2 : object.left;
      const y = object.originY === 'center' ? object.top - object.height / 2 : object.top;
      const stroke = object.stroke
        ? ` stroke="${escapeXml(object.stroke)}" stroke-width="${round(object.strokeWidth ?? 0)}"`
        : '';

      return (
        `<rect x="${round(x)}" y="${round(y)}" width="${round(object.width)}" ` +
        `height="${round(object.height)}" rx="${round(object.rx)}" ry="${round(object.ry)}" ` +
        `fill="${escapeXml(object.fill)}"${stroke}/>`
      );
    }
  }
}

/**
 * A photo inside its slot.
 *
 * `preserveAspectRatio="xMidYMid slice"` is SVG's cover fit, matching what the
 * editor previews with `object-fit: cover`. The clip path is what stops a covered
 * image spilling over the calendar grid next to it.
 */
function imageSlotToSvg(
  slotId: string,
  frame: { xMm: number; yMm: number; widthMm: number; heightMm: number },
  image: SheetImage,
): string {
  const clipId = `clip-${slotId}`;
  const zoom = image.zoom ?? 1;
  const rotation = image.rotation ?? 0;

  // Pan is a fraction of the slot, the same units the editor stores.
  const panX = (image.panX ?? 0) * frame.widthMm;
  const panY = (image.panY ?? 0) * frame.heightMm;

  const centreX = frame.xMm + frame.widthMm / 2;
  const centreY = frame.yMm + frame.heightMm / 2;

  const transforms = [
    `translate(${round(panX)} ${round(panY)})`,
    `translate(${round(centreX)} ${round(centreY)})`,
    rotation ? `rotate(${round(rotation)})` : null,
    zoom === 1 ? null : `scale(${round(zoom)})`,
    `translate(${round(-centreX)} ${round(-centreY)})`,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    `<defs><clipPath id="${clipId}">` +
    `<rect x="${round(frame.xMm)}" y="${round(frame.yMm)}" ` +
    `width="${round(frame.widthMm)}" height="${round(frame.heightMm)}"/>` +
    `</clipPath></defs>` +
    `<g clip-path="url(#${clipId})">` +
    `<image href="${escapeXml(image.href)}" x="${round(frame.xMm)}" y="${round(frame.yMm)}" ` +
    `width="${round(frame.widthMm)}" height="${round(frame.heightMm)}" ` +
    `preserveAspectRatio="xMidYMid slice" transform="${transforms}"/>` +
    `</g>`
  );
}

/**
 * Registration marks, drawn in the bleed only.
 *
 * Each corner gets two short lines that stop short of the trim box, so the guillotine
 * has something to line up on and nothing is printed inside the finished calendar.
 */
function cropMarksSvg(bleedMm: number, trimWidthMm: number, trimHeightMm: number): string {
  if (bleedMm <= 0) return '';

  const left = bleedMm;
  const top = bleedMm;
  const right = bleedMm + trimWidthMm;
  const bottom = bleedMm + trimHeightMm;

  const length = Math.min(CROP_MARK_MM, Math.max(bleedMm - CROP_MARK_GAP_MM, 0.5));
  const lines: string[] = [];

  const horizontal = (x1: number, x2: number, y: number) =>
    lines.push(`<line x1="${round(x1)}" y1="${round(y)}" x2="${round(x2)}" y2="${round(y)}"/>`);
  const vertical = (x: number, y1: number, y2: number) =>
    lines.push(`<line x1="${round(x)}" y1="${round(y1)}" x2="${round(x)}" y2="${round(y2)}"/>`);

  for (const y of [top, bottom]) {
    horizontal(Math.max(left - CROP_MARK_GAP_MM - length, 0), left - CROP_MARK_GAP_MM, y);
    horizontal(right + CROP_MARK_GAP_MM, right + CROP_MARK_GAP_MM + length, y);
  }

  for (const x of [left, right]) {
    vertical(x, Math.max(top - CROP_MARK_GAP_MM - length, 0), top - CROP_MARK_GAP_MM);
    vertical(x, bottom + CROP_MARK_GAP_MM, bottom + CROP_MARK_GAP_MM + length);
  }

  return (
    `<g id="crop-marks" stroke="#000000" stroke-width="${CROP_MARK_WEIGHT_MM}">` +
    lines.join('') +
    `</g>`
  );
}

export function renderSheetToSvg(options: RenderSheetOptions): string {
  const { sheet, holidays, images, cropMarks } = options;

  const pageWidthMm = sheet.widthMm + sheet.bleedMm * 2;
  const pageHeightMm = sheet.heightMm + sheet.bleedMm * 2;

  const body: string[] = [];

  // Objects are drawn in the order the design lists them, so a template author's
  // stacking is preserved exactly.
  for (const object of sheet.objects) {
    switch (object.type) {
      case 'imageSlot': {
        const image = images[object.slotId];
        if (!image) break;
        body.push(imageSlotToSvg(object.slotId, object, image));
        break;
      }

      case 'calendarGrid': {
        const group = renderCalendarGridToFabric({ ...object, holidays }, 1);
        body.push(
          `<g id="${escapeXml(group.id)}" transform="translate(${round(group.left)} ${round(
            group.top,
          )})">` +
            group.objects.map(fabricObjectToSvg).join('') +
            `</g>`,
        );
        break;
      }

      case 'text': {
        assertFontAllowed(object.fontFamily);
        body.push(
          `<text x="${round(object.xMm)}" y="${round(object.yMm)}" ` +
            `font-family="${escapeXml(object.fontFamily)}" ` +
            `font-size="${round(object.fontSizeMm)}" fill="${escapeXml(object.fill)}" ` +
            `dominant-baseline="text-before-edge">${escapeXml(object.text)}</text>`,
        );
        break;
      }
    }
  }

  if (cropMarks) body.push(cropMarksSvg(sheet.bleedMm, sheet.widthMm, sheet.heightMm));

  // `width`/`height` in millimetres with a 1-unit-per-mm viewBox is what makes the
  // PDF come out at the physical size rather than at 96 CSS px per inch.
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" ` +
    `width="${round(pageWidthMm)}mm" height="${round(pageHeightMm)}mm" ` +
    `viewBox="0 0 ${round(pageWidthMm)} ${round(pageHeightMm)}">` +
    body.join('') +
    `</svg>`
  );
}
