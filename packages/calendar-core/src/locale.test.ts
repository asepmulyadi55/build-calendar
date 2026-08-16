import { describe, expect, it } from 'vitest';
import {
  CALENDAR_LOCALE,
  MONTHS_ID,
  MONTHS_ID_SHORT,
  WEEKDAYS_ID_LONG,
  WEEKDAYS_ID_SHORT,
  monthNameId,
  monthNameShortId,
  weekdayHeaderLabels,
} from './locale';

describe('Indonesian tables', () => {
  it('lists the twelve months in Bahasa Indonesia', () => {
    expect(MONTHS_ID).toEqual([
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
    ]);
  });

  it('lists weekday labels Monday-first, short and long', () => {
    expect(WEEKDAYS_ID_SHORT).toEqual(['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']);
    expect(WEEKDAYS_ID_LONG).toEqual([
      'Senin',
      'Selasa',
      'Rabu',
      'Kamis',
      'Jumat',
      'Sabtu',
      'Minggu',
    ]);
  });

  it('lists month abbreviations in Bahasa Indonesia, not English', () => {
    expect(MONTHS_ID_SHORT).toEqual([
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'Mei',
      'Jun',
      'Jul',
      'Agu',
      'Sep',
      'Okt',
      'Nov',
      'Des',
    ]);
  });

  it('contains no English month or weekday name anywhere', () => {
    const english = [
      'January',
      'February',
      'March',
      'May',
      'June',
      'July',
      'August',
      'October',
      'December',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
      'Sunday',
      'Mon',
      'Tue',
      'Wed',
      'Thu',
      'Fri',
      'Sat',
      'Sun',
    ];
    const ours = [...MONTHS_ID, ...MONTHS_ID_SHORT, ...WEEKDAYS_ID_SHORT, ...WEEKDAYS_ID_LONG];

    expect(ours.filter((word) => english.includes(word))).toEqual([]);
  });

  it('is locked to id-ID', () => {
    expect(CALENDAR_LOCALE).toBe('id-ID');
  });

  it('takes no locale argument — the split cannot be broken from the app side', () => {
    // Function.length counts required parameters. Adding a locale would push these
    // up, so this fails the moment someone parameterises the language.
    expect(monthNameId).toHaveLength(1);
    expect(monthNameShortId).toHaveLength(1);
    // weekStart is optional and so does not count; it is a layout choice, not a
    // locale — the labels are Indonesian either way.
    expect(weekdayHeaderLabels).toHaveLength(0);
  });
});

describe('monthNameId', () => {
  it('is 1-indexed to match the Design JSON month property', () => {
    expect(monthNameId(1)).toBe('Januari');
    expect(monthNameId(12)).toBe('Desember');
    expect(monthNameShortId(8)).toBe('Agu');
  });

  it.each([0, 13, 1.5, Number.NaN])('rejects month %s', (month) => {
    expect(() => monthNameId(month as number)).toThrow(/month/i);
  });
});

describe('weekdayHeaderLabels', () => {
  it('reads Sen…Min for a Monday start', () => {
    expect(weekdayHeaderLabels('monday')).toEqual([
      'Sen',
      'Sel',
      'Rab',
      'Kam',
      'Jum',
      'Sab',
      'Min',
    ]);
  });

  it('rotates to Min…Sab for a Sunday start', () => {
    expect(weekdayHeaderLabels('sunday')).toEqual([
      'Min',
      'Sen',
      'Sel',
      'Rab',
      'Kam',
      'Jum',
      'Sab',
    ]);
  });

  it('defaults to Monday', () => {
    expect(weekdayHeaderLabels()).toEqual(weekdayHeaderLabels('monday'));
  });
});
