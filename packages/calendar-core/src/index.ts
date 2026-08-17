/**
 * `@buildcalendar/calendar-core`
 *
 * One calendar layout library, so the editor and the renderer cannot diverge
 * (AR-01). Zero DOM dependencies and zero runtime dependencies: it runs
 * identically in the browser and in Node.
 *
 * Hardcoded to `id-ID` with no locale parameter. Everything this package produces
 * ends up printed on a sheet, and printed output is Bahasa Indonesia
 * (master spec §10.7).
 */

export {
  CALENDAR_LOCALE,
  DEFAULT_WEEK_START,
  MONTHS_ID,
  MONTHS_ID_SHORT,
  WEEKDAYS_ID_LONG,
  WEEKDAYS_ID_SHORT,
  monthNameId,
  monthNameShortId,
  weekdayHeaderLabels,
  weekdayNameId,
  type CalendarLocale,
  type WeekStart,
} from './locale';

export { PRINT_DPI, SCREEN_DPI, mmToPt, mmToPx, ptToMm, pxToMm } from './units';

export {
  buildMonthMatrix,
  isoWeekNumber,
  parseIsoDate,
  type MonthCell,
  type MonthMatrix,
} from './month-matrix';

export {
  formatHolidayLegend,
  hasHoliday,
  hasHolidayData,
  isRedDate,
  resolveHolidays,
  type Holiday,
  type HolidayMap,
  type HolidayType,
} from './holidays';

export {
  DEFAULT_FONT_ID,
  FONT_ALLOWLIST,
  fontById,
  isAllowedFontFamily,
  requiredDebianPackages,
  type AllowedFont,
  type FontCategory,
} from './fonts';

export {
  CURRENT_SCHEMA_VERSION,
  DEFAULT_CELL_STYLE,
  createCalendarGridObject,
  isCalendarGridObject,
  isSupportedSchemaVersion,
  type CalendarDesign,
  type CalendarGridInit,
  type CalendarGridObject,
  type CellStyle,
  type DesignObject,
  type ImageSlotObject,
  type Sheet,
  type SlotDefinition,
  type TextObject,
} from './design';

export {
  renderCalendarGridToFabric,
  type CalendarGridRenderProps,
  type FabricGroupObject,
  type FabricLineObject,
  type FabricObject,
  type FabricRectObject,
  type FabricTextObject,
} from './fabric-grid';

export {
  validateCalendarDesign,
  type PresetConstraints,
  type ValidationCode,
  type ValidationIssue,
  type ValidationResult,
} from './validate-design';
