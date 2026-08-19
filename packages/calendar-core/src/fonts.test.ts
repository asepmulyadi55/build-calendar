import { describe, expect, it } from 'vitest';
import { DEFAULT_FONT_ID, FONT_ALLOWLIST, fontById, isAllowedFontFamily } from './fonts.js';

describe('font allowlist', () => {
  it('is not empty', () => {
    expect(FONT_ALLOWLIST.length).toBeGreaterThan(0);
  });

  it('has unique ids and unique family names', () => {
    expect(new Set(FONT_ALLOWLIST.map((f) => f.id)).size).toBe(FONT_ALLOWLIST.length);
    expect(new Set(FONT_ALLOWLIST.map((f) => f.family)).size).toBe(FONT_ALLOWLIST.length);
  });

  it('names the Debian package that puts each font in the renderer image', () => {
    // A font in the picker but not in the image renders as a silent fallback and
    // the PDF stops matching the preview (AR-01). The package name is how the
    // Dockerfile and this list are kept in step.
    for (const font of FONT_ALLOWLIST) {
      expect(font.debianPackage, font.id).toMatch(/^[a-z0-9.+-]+$/);
      expect(font.weights.length, font.id).toBeGreaterThan(0);
    }
  });

  it('has exactly one default, and it is on the list', () => {
    const defaults = FONT_ALLOWLIST.filter((f) => f.id === DEFAULT_FONT_ID);
    expect(defaults).toHaveLength(1);
    expect(fontById(DEFAULT_FONT_ID).family).toBe(defaults[0]!.family);
  });

  it('accepts a family on the list and rejects one that is not', () => {
    expect(isAllowedFontFamily(fontById(DEFAULT_FONT_ID).family)).toBe(true);
    expect(isAllowedFontFamily('Comic Sans MS')).toBe(false);
    expect(isAllowedFontFamily('')).toBe(false);
  });

  it('throws with a useful message for an unknown id', () => {
    expect(() => fontById('not-a-font')).toThrow(/not-a-font/);
  });
});
