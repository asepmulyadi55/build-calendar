/**
 * Millimetres are the internal unit (AR-04). Pixels exist only in a view layer,
 * and points only inside a PDF. Every conversion goes through here so the editor
 * and the renderer cannot disagree about what a millimetre is.
 */

const MM_PER_INCH = 25.4;
const PT_PER_INCH = 72;

/** Print resolution. Every exported sheet is 300 DPI (master spec §6.1). */
export const PRINT_DPI = 300;

/** CSS reference resolution, used for on-screen preview maths. */
export const SCREEN_DPI = 96;

function assertFinite(value: number, label: string): void {
  if (!Number.isFinite(value)) {
    throw new TypeError(`${label} must be a finite number, received ${String(value)}`);
  }
}

function assertDpi(dpi: number): void {
  if (!Number.isFinite(dpi) || dpi <= 0) {
    throw new RangeError(`dpi must be a positive finite number, received ${String(dpi)}`);
  }
}

/**
 * Does not round. sharp needs integer pixel dimensions and canvas geometry does
 * not, so rounding is the caller's decision — deciding it here would be wrong for
 * one of them.
 */
export function mmToPx(mm: number, dpi: number): number {
  assertFinite(mm, 'mm');
  assertDpi(dpi);
  return (mm / MM_PER_INCH) * dpi;
}

export function pxToMm(px: number, dpi: number): number {
  assertFinite(px, 'px');
  assertDpi(dpi);
  return (px / dpi) * MM_PER_INCH;
}

/** PDF points, 72 per inch. A 303 mm page is 858.898 pt. */
export function mmToPt(mm: number): number {
  assertFinite(mm, 'mm');
  return (mm / MM_PER_INCH) * PT_PER_INCH;
}

export function ptToMm(pt: number): number {
  assertFinite(pt, 'pt');
  return (pt / PT_PER_INCH) * MM_PER_INCH;
}
