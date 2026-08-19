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
} from './locale.js';

export { PRINT_DPI, SCREEN_DPI, mmToPt, mmToPx, ptToMm, pxToMm } from './units.js';

export {
  buildMonthMatrix,
  isoWeekNumber,
  parseIsoDate,
  type MonthCell,
  type MonthMatrix,
} from './month-matrix.js';

export {
  formatHolidayLegend,
  hasHoliday,
  hasHolidayData,
  holidayLegendEntries,
  isRedDate,
  resolveHolidays,
  type Holiday,
  type HolidayLegendEntry,
  type HolidayMap,
  type HolidayType,
} from './holidays.js';

export {
  DEFAULT_FONT_ID,
  FONT_ALLOWLIST,
  fontById,
  isAllowedFontFamily,
  requiredDebianPackages,
  type AllowedFont,
  type FontCategory,
} from './fonts.js';

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
} from './design.js';

export {
  renderCalendarGridToFabric,
  type CalendarGridRenderProps,
  type FabricGroupObject,
  type FabricLineObject,
  type FabricObject,
  type FabricRectObject,
  type FabricTextObject,
} from './fabric-grid.js';

export {
  validateCalendarDesign,
  type PresetConstraints,
  type ValidationCode,
  type ValidationIssue,
  type ValidationResult,
} from './validate-design.js';

export { renderSheetToSvg, type RenderSheetOptions, type SheetImage } from './svg.js';
