/**
 * The calendar grid as data. One implementation, used by the editor preview, the
 * server preview and the PDF export (AR-01).
 *
 * Every date is built in UTC. A local-time implementation shifts by a day on a
 * machine east or west of the renderer, which would silently print a wrong
 * calendar — the kind of bug nobody finds until it is on paper.
 */
import { DEFAULT_WEEK_START, type WeekStart } from './locale';

export interface MonthCell {
  /** `YYYY-MM-DD`. The key used to look up holidays. */
  readonly date: string;
  readonly day: number;
  /** 1-12 */
  readonly month: number;
  readonly year: number;
  /** False for the leading and trailing days borrowed from adjacent months. */
  readonly inMonth: boolean;
  /** 1 = Senin … 7 = Minggu */
  readonly isoWeekday: number;
  readonly isSunday: boolean;
}

export type MonthMatrix = readonly (readonly MonthCell[])[];

const ROWS = 6;
const COLUMNS = 7;

function assertYear(year: number): void {
  if (!Number.isInteger(year)) {
    throw new RangeError(`year must be an integer, received ${String(year)}`);
  }
}

function assertMonth(month: number): void {
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new RangeError(`month must be an integer from 1 to 12, received ${String(month)}`);
  }
}

function pad(value: number, width: number): string {
  return String(value).padStart(width, '0');
}

function toCell(utc: Date, month: number, year: number): MonthCell {
  const cellYear = utc.getUTCFullYear();
  const cellMonth = utc.getUTCMonth() + 1;
  const day = utc.getUTCDate();
  const sundayIndexed = utc.getUTCDay(); // 0 = Sunday

  return {
    date: `${pad(cellYear, 4)}-${pad(cellMonth, 2)}-${pad(day, 2)}`,
    day,
    month: cellMonth,
    year: cellYear,
    inMonth: cellMonth === month && cellYear === year,
    isoWeekday: sundayIndexed === 0 ? 7 : sundayIndexed,
    isSunday: sundayIndexed === 0,
  };
}

/**
 * A 6 x 7 matrix covering the whole month, padded with the leading and trailing
 * days of the adjacent months.
 *
 * Always six rows, even when the month fits in four or five. A grid that changes
 * height between months would change the layout of every sheet in a calendar.
 *
 * @param month 1-12
 * @param weekStart defaults to Monday, the Indonesian convention. This is a layout
 *   choice, not a locale: the labels are Indonesian either way.
 */
export function buildMonthMatrix(
  year: number,
  month: number,
  weekStart: WeekStart = DEFAULT_WEEK_START,
): MonthMatrix {
  assertYear(year);
  assertMonth(month);

  const firstOfMonth = new Date(Date.UTC(year, month - 1, 1));
  const firstWeekday = firstOfMonth.getUTCDay(); // 0 = Sunday

  // How many cells of the previous month sit before the 1st.
  const leading = weekStart === 'monday' ? (firstWeekday + 6) % 7 : firstWeekday;

  const matrix: MonthCell[][] = [];
  for (let row = 0; row < ROWS; row++) {
    const cells: MonthCell[] = [];
    for (let column = 0; column < COLUMNS; column++) {
      const offset = row * COLUMNS + column - leading;
      cells.push(toCell(new Date(Date.UTC(year, month - 1, 1 + offset)), month, year));
    }
    matrix.push(cells);
  }

  return matrix;
}

/**
 * ISO 8601 week number of the week containing `date`.
 *
 * ISO weeks always start on Monday and belong to the year containing their
 * Thursday, which is why 1 January 2027 falls in week 53 of 2026.
 */
export function isoWeekNumber(date: string): number {
  const parsed = parseIsoDate(date);
  const isoWeekday = parsed.getUTCDay() === 0 ? 7 : parsed.getUTCDay();

  // Move to the Thursday of this week; its year is the ISO year.
  const thursday = new Date(parsed);
  thursday.setUTCDate(parsed.getUTCDate() + (4 - isoWeekday));

  const firstOfIsoYear = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 1));
  const days = Math.round((thursday.getTime() - firstOfIsoYear.getTime()) / 86_400_000);

  return Math.floor(days / 7) + 1;
}

export function parseIsoDate(date: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) {
    throw new TypeError(`date must be formatted YYYY-MM-DD, received ${JSON.stringify(date)}`);
  }

  const [, year, month, day] = match;
  const parsed = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));

  // Rejects 2027-02-30, which Date would happily roll into March.
  if (parsed.getUTCMonth() + 1 !== Number(month) || parsed.getUTCDate() !== Number(day)) {
    throw new RangeError(`date ${date} does not exist`);
  }

  return parsed;
}
