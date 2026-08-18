/**
 * How good a photo will look in a slot (P1-US-304, VLD-RES).
 *
 * The whole point is to tell someone *before* they pay that a photo will print
 * soft. Bands come from the story: green ≥ 300 DPI, amber 150–299, red below 150,
 * where red is a blocker rather than a warning.
 */
const MM_PER_INCH = 25.4;

export type ResolutionBand = 'green' | 'amber' | 'red';

/** Pixels spread across the slot's printed width. */
export function effectiveDpi(photoWidthPx: number, slotWidthMm: number): number {
  if (!Number.isFinite(slotWidthMm) || slotWidthMm <= 0) {
    throw new RangeError(`slot width must be positive, received ${String(slotWidthMm)}`);
  }
  return photoWidthPx / (slotWidthMm / MM_PER_INCH);
}

export function resolutionBand(dpi: number): ResolutionBand {
  if (dpi >= 300) return 'green';
  if (dpi >= 150) return 'amber';
  return 'red';
}

export interface Resolution {
  dpi: number;
  band: ResolutionBand;
  /** Key into `en.editor.resolution`; the sentence itself lives in `en.ts`. */
  messageKey: ResolutionBand;
}

export function resolutionFor(input: {
  photoWidthPx: number;
  slotWidthMm: number;
}): Resolution {
  const dpi = Math.round(effectiveDpi(input.photoWidthPx, input.slotWidthMm));
  const band = resolutionBand(dpi);
  return { dpi, band, messageKey: band };
}
