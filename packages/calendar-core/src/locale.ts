/**
 * Calendar output strings. Bahasa Indonesia, hardcoded, with no locale parameter.
 *
 * This is Layer 2 of master spec §10.7: the application is English, the printed
 * calendar is Indonesian. Locking the locale here rather than passing it in is
 * deliberate — it makes the split impossible to break from the application side.
 *
 * Do not add a locale argument "for flexibility". A language option for the
 * artifact is a Phase 4 consideration and would arrive as a new function, not as
 * a parameter on this one.
 *
 * Nothing in this file may ever appear in `apps/web/src/lib/i18n/en.ts`, and
 * nothing from there may appear here.
 */

export const CALENDAR_LOCALE = 'id-ID' as const;
export type CalendarLocale = typeof CALENDAR_LOCALE;

export const MONTHS_ID = [
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
] as const;

export const MONTHS_ID_SHORT = [
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
] as const;

/** Monday first, matching the Indonesian convention. Index 0 is Senin. */
export const WEEKDAYS_ID_SHORT = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'] as const;

export const WEEKDAYS_ID_LONG = [
  'Senin',
  'Selasa',
  'Rabu',
  'Kamis',
  'Jumat',
  'Sabtu',
  'Minggu',
] as const;

export type WeekStart = 'monday' | 'sunday';

/** Indonesian calendars start the week on Monday. */
export const DEFAULT_WEEK_START: WeekStart = 'monday';

function assertMonth(month: number): void {
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new RangeError(`month must be an integer from 1 to 12, received ${String(month)}`);
  }
}

/** @param month 1-12, matching the `month` property of a Design JSON calendar grid. */
export function monthNameId(month: number): string {
  assertMonth(month);
  return MONTHS_ID[month - 1]!;
}

/** @param month 1-12 */
export function monthNameShortId(month: number): string {
  assertMonth(month);
  return MONTHS_ID_SHORT[month - 1]!;
}

/**
 * Column headers in the order they are printed, rotated for the week start.
 * Monday start reads Sen Sel Rab Kam Jum Sab Min; Sunday start puts Min first.
 */
export function weekdayHeaderLabels(weekStart: WeekStart = DEFAULT_WEEK_START): readonly string[] {
  if (weekStart === 'monday') return [...WEEKDAYS_ID_SHORT];
  return [WEEKDAYS_ID_SHORT[6], ...WEEKDAYS_ID_SHORT.slice(0, 6)];
}

/** @param isoWeekday 1 = Senin … 7 = Minggu */
export function weekdayNameId(isoWeekday: number): string {
  if (!Number.isInteger(isoWeekday) || isoWeekday < 1 || isoWeekday > 7) {
    throw new RangeError(
      `isoWeekday must be an integer from 1 to 7, received ${String(isoWeekday)}`,
    );
  }
  return WEEKDAYS_ID_LONG[isoWeekday - 1]!;
}
