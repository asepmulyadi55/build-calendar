import { describe, expect, it } from 'vitest';
import { effectiveDpi, resolutionBand, resolutionFor } from './resolution';

/**
 * The per-slot resolution indicator (P1-US-304, VLD-RES).
 *
 * Green ≥ 300 DPI, amber 150–299, red < 150. The bands are the story's; the
 * arithmetic is the same one the spike used — pixels across the slot's printed
 * width in millimetres.
 */
describe('effectiveDpi', () => {
  it('is pixels across the slot width, in inches', () => {
    // The A2 full-bleed slot: 5031 px across 426 mm is exactly 300 DPI.
    expect(Math.round(effectiveDpi(5031, 426))).toBe(300);
    // A3: 3579 px across 303 mm.
    expect(Math.round(effectiveDpi(3579, 303))).toBe(300);
  });

  it('halves when the photo has half the pixels', () => {
    expect(Math.round(effectiveDpi(2516, 426))).toBe(150);
  });

  it('refuses a slot with no width rather than dividing by zero', () => {
    expect(() => effectiveDpi(1000, 0)).toThrow(/width/i);
    expect(() => effectiveDpi(1000, -5)).toThrow(/width/i);
  });
});

describe('resolutionBand', () => {
  it('is green at 300 and above', () => {
    expect(resolutionBand(300)).toBe('green');
    expect(resolutionBand(450)).toBe('green');
  });

  it('is amber from 150 up to but not including 300', () => {
    expect(resolutionBand(150)).toBe('amber');
    expect(resolutionBand(299)).toBe('amber');
    expect(resolutionBand(299.9)).toBe('amber');
  });

  it('is red below 150 — the level VLD-RES calls a blocker', () => {
    expect(resolutionBand(149)).toBe('red');
    expect(resolutionBand(72)).toBe('red');
    expect(resolutionBand(0)).toBe('red');
  });
});

describe('resolutionFor', () => {
  it('reports the DPI, the band, and a message key for each', () => {
    const good = resolutionFor({ photoWidthPx: 5031, slotWidthMm: 426 });
    expect(good.band).toBe('green');
    expect(good.dpi).toBe(300);

    const poor = resolutionFor({ photoWidthPx: 1000, slotWidthMm: 426 });
    expect(poor.band).toBe('red');
    expect(poor.dpi).toBe(60);
  });

  it('rounds the DPI, because a user does not need two decimal places', () => {
    expect(Number.isInteger(resolutionFor({ photoWidthPx: 1234, slotWidthMm: 297 }).dpi)).toBe(
      true,
    );
  });
});
