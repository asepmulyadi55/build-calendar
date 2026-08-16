/**
 * Holiday resolution for the printed sheet.
 *
 * `name` is the official Indonesian designation, verbatim, and is never
 * translated: `Hari Raya Nyepi` is not "Day of Silence". These are legal
 * designations, and translating one makes the calendar factually wrong
 * (master spec §6.2, §10.7).
 */
import { monthNameShortId } from './locale';
import { parseIsoDate, type MonthCell } from './month-matrix';

export type HolidayType = 'national' | 'joint_leave' | 'religious' | 'international';

export interface Holiday {
  /** `YYYY-MM-DD` */
  readonly date: string;
  /** Official Indonesian name, verbatim. */
  readonly name: string;
  readonly type: HolidayType;
  readonly year: number;
  /** Red in the grid, and printed in the legend. */
  readonly isRedDate: boolean;
  readonly source?: string;
}

export type HolidayMap = ReadonlyMap<string, readonly Holiday[]>;

/**
 * Ordering when several holidays land on one date. Fixed so the same input always
 * renders the same sheet, whatever order the database returned rows in.
 * A national holiday outranks a joint leave day (*cuti bersama*) because it is
 * what the reader is looking for.
 */
const TYPE_RANK: Record<HolidayType, number> = {
  national: 0,
  joint_leave: 1,
  religious: 2,
  international: 3,
};

function compareHolidays(a: Holiday, b: Holiday): number {
  const byType = TYPE_RANK[a.type] - TYPE_RANK[b.type];
  if (byType !== 0) return byType;
  return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
}

/**
 * Holidays falling inside the given month, keyed by `YYYY-MM-DD`.
 *
 * Leading and trailing days from adjacent months are excluded: they render grey
 * and are not part of this sheet's month.
 *
 * @param month 1-12
 */
export function resolveHolidays(
  year: number,
  month: number,
  holidays: readonly Holiday[],
): HolidayMap {
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new RangeError(`month must be an integer from 1 to 12, received ${String(month)}`);
  }

  const map = new Map<string, Holiday[]>();

  for (const holiday of holidays) {
    const parsed = parseIsoDate(holiday.date); // throws on a malformed date
    if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() + 1 !== month) continue;

    const existing = map.get(holiday.date);
    if (existing) existing.push(holiday);
    else map.set(holiday.date, [holiday]);
  }

  for (const entries of map.values()) entries.sort(compareHolidays);

  return map;
}

/**
 * Red in the grid: any Sunday, or any date carrying a holiday marked
 * `isRedDate`. Days outside the rendered month stay grey whatever falls on them.
 */
export function isRedDate(cell: MonthCell, holidays: HolidayMap): boolean {
  if (!cell.inMonth) return false;
  if (cell.isSunday) return true;
  return (holidays.get(cell.date) ?? []).some((holiday) => holiday.isRedDate);
}

/** True when the date carries a holiday, red or not — used to draw the marker dot. */
export function hasHoliday(cell: MonthCell, holidays: HolidayMap): boolean {
  return cell.inMonth && (holidays.get(cell.date) ?? []).length > 0;
}

/**
 * Whether any holiday data exists for a year at all.
 *
 * The editor must warn when this is false. Rendering a calendar with no red dates
 * silently is worse than refusing: joint leave days are decreed late in the
 * preceding year, and a user would only discover the omission in print.
 */
export function hasHolidayData(year: number, holidays: readonly Holiday[]): boolean {
  return holidays.some((holiday) => holiday.date.startsWith(`${String(year)}-`));
}

/**
 * Legend lines, one per holiday, date-ordered: `1 Jan — Tahun Baru Masehi`.
 * Two holidays on one date produce two lines.
 */
export function formatHolidayLegend(holidays: HolidayMap): string[] {
  return [...holidays.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .flatMap(([date, entries]) => {
      const parsed = parseIsoDate(date);
      const label = `${String(parsed.getUTCDate())} ${monthNameShortId(parsed.getUTCMonth() + 1)}`;
      return entries.map((holiday) => `${label} — ${holiday.name}`);
    });
}
