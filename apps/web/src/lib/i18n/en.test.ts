import { describe, expect, it } from 'vitest';
import { en } from './en';

/**
 * Guards the language split from master spec §10.7: the interface is English,
 * the printed calendar is Indonesian. A month or weekday name appearing in `en.ts`
 * means calendar output is leaking into the interface layer, or vice versa.
 */
const INDONESIAN_CALENDAR_WORDS = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
  'Senin',
  'Selasa',
  'Rabu',
  'Kamis',
  'Jumat',
  'Sabtu',
  'Minggu',
];

/**
 * Interface words that have slipped in before. `Duplikat` shipped in the editor
 * panel and the month/weekday guard above did not catch it. Only words with no
 * English homograph belong here.
 */
const INDONESIAN_INTERFACE_WORDS = ['Duplikat', 'Simpan', 'Batal', 'Hapus', 'Unduh', 'Lanjut'];

function flatten(value: unknown, path: string[] = []): [string, string][] {
  if (typeof value === 'string') return [[path.join('.'), value]];
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, child]) => flatten(child, [...path, key]));
  }
  return [];
}

describe('en.ts', () => {
  const entries = flatten(en);

  it('contains strings', () => {
    expect(entries.length).toBeGreaterThan(0);
  });

  it('has no empty strings', () => {
    const empty = entries.filter(([, text]) => text.trim() === '');
    expect(empty).toEqual([]);
  });

  it('contains no Indonesian calendar vocabulary', () => {
    const offenders = entries.filter(([, text]) =>
      INDONESIAN_CALENDAR_WORDS.some((word) => new RegExp(`\\b${word}\\b`).test(text)),
    );
    expect(offenders).toEqual([]);
  });

  it('contains no Indonesian interface vocabulary', () => {
    const offenders = entries.filter(([, text]) =>
      INDONESIAN_INTERFACE_WORDS.some((word) => new RegExp(`\\b${word}\\b`, 'i').test(text)),
    );
    expect(offenders).toEqual([]);
  });
});
