import { describe, expect, it } from 'vitest';
import { buildMonthMatrix } from './month-matrix.js';
import {
  formatHolidayLegend,
  hasHolidayData,
  holidayLegendEntries,
  isRedDate,
  resolveHolidays,
  type Holiday,
} from './holidays.js';

const holiday = (date: string, name: string, extra: Partial<Holiday> = {}): Holiday => ({
  date,
  name,
  type: 'national',
  year: Number(date.slice(0, 4)),
  isRedDate: true,
  ...extra,
});

describe('resolveHolidays', () => {
  it('maps a date to its holiday entries', () => {
    const map = resolveHolidays(2027, 1, [holiday('2027-01-01', 'Tahun Baru Masehi')]);

    expect(map.get('2027-01-01')).toHaveLength(1);
    expect(map.get('2027-01-01')?.[0]?.name).toBe('Tahun Baru Masehi');
    expect(map.get('2027-01-02')).toBeUndefined();
  });

  it('keeps only the requested month', () => {
    const map = resolveHolidays(2027, 1, [
      holiday('2027-01-01', 'Tahun Baru Masehi'),
      holiday('2027-08-17', 'Hari Kemerdekaan Republik Indonesia'),
      holiday('2026-01-01', 'Tahun Baru Masehi'),
    ]);

    expect([...map.keys()]).toEqual(['2027-01-01']);
  });

  describe('two holidays falling on one date', () => {
    const twoOnOneDay = [
      holiday('2027-03-08', 'Isra Mikraj Nabi Muhammad SAW', { type: 'religious' }),
      holiday('2027-03-08', 'Hari Raya Nyepi Tahun Baru Saka 1949', { type: 'religious' }),
    ];

    it('returns both, not the last one written', () => {
      const map = resolveHolidays(2027, 3, twoOnOneDay);
      const entries = map.get('2027-03-08');

      expect(entries).toHaveLength(2);
      expect(entries?.map((h) => h.name)).toEqual([
        'Hari Raya Nyepi Tahun Baru Saka 1949',
        'Isra Mikraj Nabi Muhammad SAW',
      ]);
    });

    it('orders them deterministically, whatever order they arrive in', () => {
      const forwards = resolveHolidays(2027, 3, twoOnOneDay).get('2027-03-08');
      const backwards = resolveHolidays(2027, 3, [...twoOnOneDay].reverse()).get('2027-03-08');

      expect(forwards?.map((h) => h.name)).toEqual(backwards?.map((h) => h.name));
    });

    it('sorts a national holiday ahead of a joint leave day on the same date', () => {
      const map = resolveHolidays(2027, 12, [
        holiday('2027-12-24', 'Cuti Bersama Hari Raya Natal', { type: 'joint_leave' }),
        holiday('2027-12-24', 'Hari Raya Natal', { type: 'national' }),
      ]);

      expect(map.get('2027-12-24')?.map((h) => h.type)).toEqual(['national', 'joint_leave']);
    });

    it('renders both names in the legend for that date', () => {
      const legend = formatHolidayLegend(resolveHolidays(2027, 3, twoOnOneDay));

      expect(legend).toEqual([
        '8 Mar — Hari Raya Nyepi Tahun Baru Saka 1949',
        '8 Mar — Isra Mikraj Nabi Muhammad SAW',
      ]);
    });

    it('does not collapse duplicates that share a name but differ in type', () => {
      const map = resolveHolidays(2027, 5, [
        holiday('2027-05-01', 'Hari Buruh Internasional', { type: 'national' }),
        holiday('2027-05-01', 'Hari Buruh Internasional', { type: 'international' }),
      ]);
      expect(map.get('2027-05-01')).toHaveLength(2);
    });
  });

  it('rejects malformed dates rather than silently dropping them', () => {
    expect(() => resolveHolidays(2027, 1, [holiday('01/01/2027', 'Bad')])).toThrow(/date/i);
  });
});

describe('isRedDate', () => {
  const matrix = buildMonthMatrix(2027, 1);
  const cell = (date: string) => matrix.flat().find((c) => c.date === date)!;

  it('is true for every Sunday', () => {
    // Sundays in January 2027: 3, 10, 17, 24, 31.
    for (const date of ['2027-01-03', '2027-01-10', '2027-01-17', '2027-01-24', '2027-01-31']) {
      expect(isRedDate(cell(date), resolveHolidays(2027, 1, [])), date).toBe(true);
    }
  });

  it('is true for a red holiday on a weekday', () => {
    const map = resolveHolidays(2027, 1, [holiday('2027-01-01', 'Tahun Baru Masehi')]);
    expect(cell('2027-01-01').isSunday).toBe(false);
    expect(isRedDate(cell('2027-01-01'), map)).toBe(true);
  });

  it('is false for a holiday that is not a red date', () => {
    const map = resolveHolidays(2027, 1, [
      holiday('2027-01-15', 'Hari Peristiwa Malari', { isRedDate: false, type: 'international' }),
    ]);
    expect(isRedDate(cell('2027-01-15'), map)).toBe(false);
  });

  it('is false for an ordinary weekday', () => {
    expect(isRedDate(cell('2027-01-05'), resolveHolidays(2027, 1, []))).toBe(false);
  });

  it('is false for a Sunday outside the rendered month, so grey stays grey', () => {
    // 2027-02-07 is a trailing Sunday in the January grid.
    const trailing = cell('2027-02-07');
    expect(trailing.inMonth).toBe(false);
    expect(isRedDate(trailing, resolveHolidays(2027, 1, []))).toBe(false);
  });
});

describe('hasHolidayData', () => {
  // Never render an empty holiday set silently — the editor must warn instead.
  it('is false when the year has no holidays at all', () => {
    expect(hasHolidayData(2027, [])).toBe(false);
    expect(hasHolidayData(2027, [holiday('2026-01-01', 'Tahun Baru Masehi')])).toBe(false);
  });

  it('is true when at least one holiday exists for the year', () => {
    expect(hasHolidayData(2027, [holiday('2027-01-01', 'Tahun Baru Masehi')])).toBe(true);
  });
});

describe('holidayLegendEntries', () => {
  it('carries the type so joint leave can be styled distinctly', () => {
    const map = resolveHolidays(2027, 1, [
      holiday('2027-01-01', 'Tahun Baru Masehi'),
      holiday('2027-01-08', 'Cuti Bersama Tahun Baru Imlek', { type: 'joint_leave' }),
    ]);

    const entries = holidayLegendEntries(map);

    expect(entries.map((entry) => entry.type)).toEqual(['national', 'joint_leave']);
    expect(entries[1]!.line).toBe('8 Jan — Cuti Bersama Tahun Baru Imlek');
  });

  it('produces exactly the lines the string legend does — there is one legend', () => {
    const map = resolveHolidays(2027, 1, [
      holiday('2027-01-01', 'Tahun Baru Masehi'),
      holiday('2027-01-08', 'Cuti Bersama Tahun Baru Imlek', { type: 'joint_leave' }),
    ]);

    expect(holidayLegendEntries(map).map((entry) => entry.line)).toEqual(formatHolidayLegend(map));
  });
});

describe('formatHolidayLegend', () => {
  it('prints "1 Jan — Tahun Baru Masehi" with the Indonesian month abbreviation', () => {
    const map = resolveHolidays(2027, 1, [holiday('2027-01-01', 'Tahun Baru Masehi')]);
    expect(formatHolidayLegend(map)).toEqual(['1 Jan — Tahun Baru Masehi']);
  });

  it('uses Indonesian abbreviations, never English ones', () => {
    const map = resolveHolidays(2027, 8, [
      holiday('2027-08-17', 'Hari Kemerdekaan Republik Indonesia'),
    ]);
    expect(formatHolidayLegend(map)).toEqual(['17 Agu — Hari Kemerdekaan Republik Indonesia']);
  });

  it('sorts by date', () => {
    const map = resolveHolidays(2027, 12, [
      holiday('2027-12-25', 'Hari Raya Natal'),
      holiday('2027-12-24', 'Cuti Bersama Hari Raya Natal', { type: 'joint_leave' }),
    ]);
    expect(formatHolidayLegend(map)).toEqual([
      '24 Des — Cuti Bersama Hari Raya Natal',
      '25 Des — Hari Raya Natal',
    ]);
  });

  it('never translates a holiday name', () => {
    const map = resolveHolidays(2027, 3, [
      holiday('2027-03-08', 'Hari Raya Nyepi Tahun Baru Saka 1949', { type: 'religious' }),
    ]);
    expect(formatHolidayLegend(map)[0]).toContain('Hari Raya Nyepi');
    expect(formatHolidayLegend(map)[0]).not.toMatch(/day of silence/i);
  });
});
