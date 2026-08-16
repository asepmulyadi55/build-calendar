import { describe, expect, it } from 'vitest';
import { PRINT_DPI, SCREEN_DPI, mmToPx, pxToMm, mmToPt, ptToMm } from './units';

describe('mmToPx / pxToMm', () => {
  it('converts A3-plus-bleed to the pixel count a 300 DPI slot needs', () => {
    // 303 mm at 300 DPI = 303 / 25.4 * 300 = 3578.74…
    expect(mmToPx(303, PRINT_DPI)).toBeCloseTo(3578.74, 2);
    expect(mmToPx(426, PRINT_DPI)).toBeCloseTo(5031.5, 2);
  });

  it('round-trips', () => {
    for (const mm of [1, 25.4, 148, 210, 297, 420, 594]) {
      expect(pxToMm(mmToPx(mm, PRINT_DPI), PRINT_DPI)).toBeCloseTo(mm, 10);
    }
  });

  it('treats one inch as 25.4 mm', () => {
    expect(mmToPx(25.4, 300)).toBe(300);
    expect(pxToMm(96, SCREEN_DPI)).toBe(25.4);
  });

  it("does not round — rounding is the caller's decision", () => {
    // sharp needs integers; canvas geometry does not. Deciding here would be wrong
    // for one of them.
    expect(Number.isInteger(mmToPx(303, PRINT_DPI))).toBe(false);
  });

  it('maps zero to zero', () => {
    expect(mmToPx(0, PRINT_DPI)).toBe(0);
    expect(pxToMm(0, PRINT_DPI)).toBe(0);
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])('rejects dpi %s', (dpi) => {
    expect(() => mmToPx(10, dpi as number)).toThrow(/dpi/i);
    expect(() => pxToMm(10, dpi as number)).toThrow(/dpi/i);
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY])('rejects non-finite input %s', (value) => {
    expect(() => mmToPx(value as number, PRINT_DPI)).toThrow(/finite/i);
    expect(() => pxToMm(value as number, PRINT_DPI)).toThrow(/finite/i);
  });
});

describe('mmToPt / ptToMm', () => {
  it('uses the PDF point, 72 per inch', () => {
    // The spike measured 303 mm as 858.96 pt in the exported PDF.
    expect(mmToPt(303)).toBeCloseTo(858.898, 3);
    expect(ptToMm(72)).toBeCloseTo(25.4, 10);
  });

  it('round-trips', () => {
    expect(ptToMm(mmToPt(426))).toBeCloseTo(426, 10);
  });
});
