import { describe, expect, it } from 'vitest';
import { buildMonthMatrix, type MonthCell } from './month-matrix.js';

const dates = (matrix: readonly (readonly MonthCell[])[]) =>
  matrix.map((row) => row.map((c) => c.date));
const days = (matrix: readonly (readonly MonthCell[])[]) =>
  matrix.map((row) => row.map((c) => c.day));
const inMonthDays = (matrix: readonly (readonly MonthCell[])[]) =>
  matrix
    .flat()
    .filter((c) => c.inMonth)
    .map((c) => c.day);

describe('buildMonthMatrix', () => {
  it('always returns 6 rows of 7, whatever the month', () => {
    for (let month = 1; month <= 12; month++) {
      for (const year of [2026, 2027, 2028]) {
        const matrix = buildMonthMatrix(year, month);
        expect(matrix, `${year}-${month}`).toHaveLength(6);
        for (const row of matrix) expect(row).toHaveLength(7);
      }
    }
  });

  it('includes leading and trailing days from the adjacent months', () => {
    // January 2027 starts on a Friday, so Monday-start leads with 28-31 December.
    const matrix = buildMonthMatrix(2027, 1);

    expect(dates(matrix)[0]).toEqual([
      '2026-12-28',
      '2026-12-29',
      '2026-12-30',
      '2026-12-31',
      '2027-01-01',
      '2027-01-02',
      '2027-01-03',
    ]);

    const leading = matrix[0]!.slice(0, 4);
    expect(leading.every((c) => !c.inMonth)).toBe(true);
    expect(leading.every((c) => c.month === 12 && c.year === 2026)).toBe(true);

    // Trailing days run into February.
    expect(dates(matrix)[5]).toEqual([
      '2027-02-01',
      '2027-02-02',
      '2027-02-03',
      '2027-02-04',
      '2027-02-05',
      '2027-02-06',
      '2027-02-07',
    ]);
  });

  describe('leap-year February', () => {
    it('2028 has 29 days and the 29th is in the month', () => {
      const matrix = buildMonthMatrix(2028, 2);
      const own = inMonthDays(matrix);

      expect(own).toHaveLength(29);
      expect(own.at(-1)).toBe(29);
      expect(matrix.flat().find((c) => c.date === '2028-02-29')?.inMonth).toBe(true);
    });

    it('2027 has 28 days and 29 February does not exist', () => {
      const matrix = buildMonthMatrix(2027, 2);
      const own = inMonthDays(matrix);

      expect(own).toHaveLength(28);
      expect(own.at(-1)).toBe(28);
      expect(matrix.flat().some((c) => c.date === '2027-02-29')).toBe(false);
    });

    it('2100 is not a leap year — the century rule holds', () => {
      expect(inMonthDays(buildMonthMatrix(2100, 2))).toHaveLength(28);
      expect(inMonthDays(buildMonthMatrix(2000, 2))).toHaveLength(29);
    });

    it('February 2027 starts on Monday and still fills 6 rows', () => {
      const matrix = buildMonthMatrix(2027, 2);
      expect(matrix[0]![0]!.date).toBe('2027-02-01');
      expect(matrix[0]![0]!.inMonth).toBe(true);
      expect(matrix).toHaveLength(6);
      // A 28-day month starting Monday fills exactly 4 rows; rows 5 and 6 are March.
      expect(matrix[4]!.every((c) => !c.inMonth)).toBe(true);
    });
  });

  describe('a month starting on Sunday', () => {
    // 1 March 2026 is a Sunday.
    it('Monday-start pushes it to the last column of the first row', () => {
      const matrix = buildMonthMatrix(2026, 3, 'monday');
      const first = matrix[0]!;

      expect(first[6]!.date).toBe('2026-03-01');
      expect(first[6]!.inMonth).toBe(true);
      expect(first[6]!.isSunday).toBe(true);
      // The six cells before it are late February.
      expect(first.slice(0, 6).every((c) => c.month === 2)).toBe(true);
      expect(first[0]!.date).toBe('2026-02-23');
    });

    it('Sunday-start puts it in the first cell with no leading days', () => {
      const matrix = buildMonthMatrix(2026, 3, 'sunday');
      const first = matrix[0]!;

      expect(first[0]!.date).toBe('2026-03-01');
      expect(first[0]!.inMonth).toBe(true);
      expect(first.every((c) => c.inMonth)).toBe(true);
    });
  });

  describe('week start', () => {
    it('defaults to Monday when omitted — the Indonesian convention', () => {
      expect(days(buildMonthMatrix(2027, 1))).toEqual(days(buildMonthMatrix(2027, 1, 'monday')));
    });

    it('Monday start puts Sunday in the last column, every row', () => {
      const matrix = buildMonthMatrix(2027, 1, 'monday');
      for (const row of matrix) {
        expect(row[0]!.isoWeekday).toBe(1);
        expect(row[6]!.isoWeekday).toBe(7);
        expect(row[6]!.isSunday).toBe(true);
      }
    });

    it('Sunday start puts Sunday in the first column, every row', () => {
      const matrix = buildMonthMatrix(2027, 1, 'sunday');
      for (const row of matrix) {
        expect(row[0]!.isoWeekday).toBe(7);
        expect(row[0]!.isSunday).toBe(true);
        expect(row[6]!.isoWeekday).toBe(6);
      }
    });

    it('shifts the grid by one day but never changes which days are in the month', () => {
      const monday = inMonthDays(buildMonthMatrix(2027, 1, 'monday'));
      const sunday = inMonthDays(buildMonthMatrix(2027, 1, 'sunday'));
      expect(monday).toEqual(sunday);

      // January 2027 starts on a Friday: Monday-start leads with 4 cells, Sunday-start with 5.
      expect(buildMonthMatrix(2027, 1, 'monday')[0]!.filter((c) => !c.inMonth)).toHaveLength(4);
      expect(buildMonthMatrix(2027, 1, 'sunday')[0]!.filter((c) => !c.inMonth)).toHaveLength(5);
    });
  });

  describe('input validation', () => {
    it.each([0, 13, -1, 1.5, Number.NaN])('rejects month %s', (month) => {
      expect(() => buildMonthMatrix(2027, month as number)).toThrow(/month/i);
    });

    it.each([1.5, Number.NaN, Number.POSITIVE_INFINITY])('rejects year %s', (year) => {
      expect(() => buildMonthMatrix(year as number, 1)).toThrow(/year/i);
    });
  });

  it('is deterministic and independent of the host time zone', () => {
    // Dates are built in UTC. If they were not, a machine at UTC+7 or UTC-5 would
    // shift every cell by a day and the printed calendar would be wrong.
    const a = dates(buildMonthMatrix(2027, 1));
    const b = dates(buildMonthMatrix(2027, 1));
    expect(a).toEqual(b);
    expect(a.flat().every((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))).toBe(true);
  });
});
