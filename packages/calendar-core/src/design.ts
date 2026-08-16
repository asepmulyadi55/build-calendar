/**
 * Design JSON — the source of truth for a calendar (AR-02).
 *
 * A built-in template and a Phase 3 custom design share this one schema: a
 * template is just a Design JSON with some objects marked `locked` and some slots
 * left to fill. Every coordinate is in millimetres (AR-04).
 *
 * `schemaVersion` is present from day one so old templates never break when the
 * schema evolves (AR-06). Bump `CURRENT_SCHEMA_VERSION` and add a migration step
 * when the shape changes.
 */
import { DEFAULT_FONT_ID, fontById, isAllowedFontFamily } from './fonts';
import { CALENDAR_LOCALE, DEFAULT_WEEK_START, type CalendarLocale, type WeekStart } from './locale';

export const CURRENT_SCHEMA_VERSION = 1;

export function isSupportedSchemaVersion(version: number): boolean {
  return Number.isInteger(version) && version >= 1 && version <= CURRENT_SCHEMA_VERSION;
}

/** Colours default to the design system in `design/assets/ds.css`. */
const INK = '#16171B';
const INK_25 = '#B6B8BE';
const RULE = '#DCDBD4';
const MERAH = '#D8232A';

export interface CellStyle {
  readonly textColor: string;
  /** Leading and trailing days from the adjacent months. */
  readonly mutedColor: string;
  readonly ruleColor: string;
  /** Day-number size in millimetres. */
  readonly dayFontSizeMm: number;
  readonly headerFontSizeMm: number;
  readonly holidayNameFontSizeMm: number;
}

export const DEFAULT_CELL_STYLE: CellStyle = {
  textColor: INK,
  mutedColor: INK_25,
  ruleColor: RULE,
  dayFontSizeMm: 4.5,
  headerFontSizeMm: 2.6,
  holidayNameFontSizeMm: 1.6,
};

/**
 * The calendar grid is a programmatic object, never an image (AR-03), so it can be
 * re-rendered deterministically at any scale.
 *
 * `locale` is the literal `'id-ID'` and nothing else. It is recorded on the object
 * rather than passed as a parameter, which is what keeps the Indonesian output
 * layer unbreakable from the application side.
 */
export interface CalendarGridObject {
  readonly type: 'calendarGrid';
  readonly id: string;
  /** 1-12 */
  readonly month: number;
  readonly year: number;
  readonly weekStart: WeekStart;
  readonly locale: CalendarLocale;
  readonly showHolidayNames: boolean;
  readonly showWeekNumbers: boolean;
  readonly holidayColor: string;
  readonly fontFamily: string;
  readonly cellStyle: CellStyle;
  readonly xMm: number;
  readonly yMm: number;
  readonly widthMm: number;
  readonly heightMm: number;
  readonly locked?: boolean;
}

export interface ImageSlotObject {
  readonly type: 'imageSlot';
  readonly id: string;
  readonly slotId: string;
  readonly xMm: number;
  readonly yMm: number;
  readonly widthMm: number;
  readonly heightMm: number;
  readonly locked?: boolean;
}

export interface TextObject {
  readonly type: 'text';
  readonly id: string;
  readonly text: string;
  readonly fontFamily: string;
  readonly fontSizeMm: number;
  readonly fill: string;
  readonly xMm: number;
  readonly yMm: number;
  readonly widthMm: number;
  readonly heightMm: number;
  readonly locked?: boolean;
}

export type DesignObject = CalendarGridObject | ImageSlotObject | TextObject;

/** What a template asks the user to supply. Validated before export (VLD-EMPTY). */
export interface SlotDefinition {
  readonly id: string;
  readonly type: 'image' | 'text';
  readonly required: boolean;
  readonly label?: string;
  readonly maxLength?: number;
  readonly xMm: number;
  readonly yMm: number;
  readonly widthMm: number;
  readonly heightMm: number;
}

export interface Sheet {
  readonly id: string;
  /** Position in the calendar, 0-based. */
  readonly index: number;
  /** Trim size. The exported page is this plus `bleedMm` on all four sides. */
  readonly widthMm: number;
  readonly heightMm: number;
  readonly bleedMm: number;
  readonly safeMarginMm: number;
  readonly objects: readonly DesignObject[];
  readonly slots: readonly SlotDefinition[];
}

export interface CalendarDesign {
  readonly schemaVersion: number;
  /** References `product_presets.code`; dimensions are never duplicated here. */
  readonly productPresetCode: string;
  readonly year: number;
  /** 1-12. Calendars may start at a month other than January. */
  readonly startMonth: number;
  readonly sheets: readonly Sheet[];
}

export type CalendarGridInit = Omit<Partial<CalendarGridObject>, 'type' | 'locale' | 'cellStyle'> &
  Pick<CalendarGridObject, 'id' | 'month' | 'year' | 'xMm' | 'yMm' | 'widthMm' | 'heightMm'> & {
    readonly type?: 'calendarGrid';
    readonly locale?: CalendarLocale;
    readonly cellStyle?: Partial<CellStyle>;
  };

/**
 * Builds a grid object with the defaults filled in, and refuses a font that is not
 * on the allowlist — the one place that check is cheap, because the alternative is
 * discovering the substitution in a printed PDF.
 */
export function createCalendarGridObject(init: CalendarGridInit): CalendarGridObject {
  const fontFamily = init.fontFamily ?? fontById(DEFAULT_FONT_ID).family;

  if (!isAllowedFontFamily(fontFamily)) {
    throw new RangeError(
      `${fontFamily} is not on the font allowlist; it would not exist in the renderer image`,
    );
  }

  if (!Number.isInteger(init.month) || init.month < 1 || init.month > 12) {
    throw new RangeError(`month must be an integer from 1 to 12, received ${String(init.month)}`);
  }

  return {
    type: 'calendarGrid',
    id: init.id,
    month: init.month,
    year: init.year,
    weekStart: init.weekStart ?? DEFAULT_WEEK_START,
    locale: CALENDAR_LOCALE,
    showHolidayNames: init.showHolidayNames ?? true,
    showWeekNumbers: init.showWeekNumbers ?? false,
    holidayColor: init.holidayColor ?? MERAH,
    fontFamily,
    cellStyle: { ...DEFAULT_CELL_STYLE, ...init.cellStyle },
    xMm: init.xMm,
    yMm: init.yMm,
    widthMm: init.widthMm,
    heightMm: init.heightMm,
    ...(init.locked === undefined ? {} : { locked: init.locked }),
  };
}

export function isCalendarGridObject(value: unknown): value is CalendarGridObject {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { type?: unknown }).type === 'calendarGrid'
  );
}
