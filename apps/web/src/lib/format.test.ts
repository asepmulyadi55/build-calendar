import { describe, expect, it } from 'vitest';
import { formatRupiah, formatRupiahCompactPer } from './format';

/**
 * Master spec §10.7: number formatting stays `id-ID` even though the copy is
 * English. Prices read `Rp1.250.000`, never `Rp1,250,000`. Getting this wrong on a
 * pricing page is the kind of error that quietly costs conversions in Indonesia.
 */
describe('formatRupiah', () => {
  it('groups thousands with a dot, the Indonesian convention', () => {
    expect(formatRupiah(10_000)).toBe('Rp10.000');
    expect(formatRupiah(25_000)).toBe('Rp25.000');
    expect(formatRupiah(50_000)).toBe('Rp50.000');
    expect(formatRupiah(1_250_000)).toBe('Rp1.250.000');
  });

  it('never uses a comma as the thousands separator', () => {
    expect(formatRupiah(1_250_000)).not.toContain(',');
  });

  it('has no space between the symbol and the number, matching the prototype', () => {
    expect(formatRupiah(10_000)).toMatch(/^Rp\d/);
  });

  it('shows no decimals — rupiah has no minor unit in practice', () => {
    expect(formatRupiah(1666.67)).toBe('Rp1.667');
    expect(formatRupiah(0)).toBe('Rp0');
  });

  it('rejects values that would render as garbage', () => {
    expect(() => formatRupiah(Number.NaN)).toThrow(/finite/i);
    expect(() => formatRupiah(-1)).toThrow(/negative/i);
  });
});

describe('formatRupiahCompactPer', () => {
  it('renders the per-calendar line exactly as the prototype does', () => {
    expect(formatRupiahCompactPer(10_000, 5, 1)).toBe('Rp2.000');
    expect(formatRupiahCompactPer(25_000, 15, 1)).toBe('Rp1.667');
    expect(formatRupiahCompactPer(50_000, 35, 1)).toBe('Rp1.429');
  });

  it('scales with the unlock cost rather than assuming one coin', () => {
    // BR-C04 puts the unlock cost in product configuration, so it can change
    // without a redeployment. The per-calendar price has to follow it.
    expect(formatRupiahCompactPer(10_000, 5, 2)).toBe('Rp4.000');
  });

  it('refuses to divide by zero coins', () => {
    expect(() => formatRupiahCompactPer(10_000, 0, 1)).toThrow(/coin/i);
  });
});
