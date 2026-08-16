/**
 * The calendar grid as a Fabric group.
 *
 * Returns Fabric's own serialised form rather than a live `fabric.Group`. That is
 * what lets this package keep zero DOM dependencies while still being the single
 * rendering engine (AR-01): the editor enlivens the same JSON in the browser, and
 * the renderer enlivens it in Node, so neither can drift from the other.
 *
 *   const [group] = await util.enlivenObjects([renderCalendarGridToFabric(props, scale)]);
 *
 * `type` values are Fabric v6 class names (`Group`, `Text`, `Line`, `Rect`) — v6
 * lowercases them when looking up the class registry, so both casings enliven, but
 * these are what `toObject()` emits.
 *
 * Child coordinates are relative to the group's top-left, and every child carries
 * `originX: 'left'` / `originY: 'top'`. Construct the group with the same origins.
 *
 * `scale` is pixels per millimetre. Millimetres are the stored unit (AR-04); this
 * function is the only place they become pixels.
 */
import { isRedDate, hasHoliday, resolveHolidays, type Holiday } from './holidays';
import { buildMonthMatrix, isoWeekNumber } from './month-matrix';
import { weekdayHeaderLabels } from './locale';
import type { CalendarGridObject } from './design';

export interface FabricTextObject {
  readonly type: 'Text';
  readonly id: string;
  readonly text: string;
  readonly left: number;
  readonly top: number;
  readonly fontSize: number;
  readonly fontFamily: string;
  readonly fontWeight: number;
  readonly fill: string;
  readonly textAlign: 'center' | 'left' | 'right';
  readonly originX: 'left' | 'center' | 'right';
  readonly originY: 'top' | 'center' | 'bottom';
}

export interface FabricLineObject {
  readonly type: 'Line';
  readonly id: string;
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
  readonly stroke: string;
  readonly strokeWidth: number;
}

export interface FabricRectObject {
  readonly type: 'Rect';
  readonly id: string;
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
  readonly rx: number;
  readonly ry: number;
  readonly fill: string;
  readonly originX: 'left' | 'center' | 'right';
  readonly originY: 'top' | 'center' | 'bottom';
}

export type FabricObject = FabricTextObject | FabricLineObject | FabricRectObject;

export interface FabricGroupObject {
  readonly type: 'Group';
  readonly id: string;
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
  readonly originX: 'left';
  readonly originY: 'top';
  readonly objects: readonly FabricObject[];
}

export type CalendarGridRenderProps = CalendarGridObject & {
  readonly holidays: readonly Holiday[];
};

/** Width of the optional ISO week-number column, as a fraction of a day column. */
const WEEK_COLUMN_RATIO = 0.6;

/** Round to a tenth of a pixel. Sub-tenth precision is noise in a PDF. */
const round = (value: number): number => Math.round(value * 10) / 10;

export function renderCalendarGridToFabric(
  props: CalendarGridRenderProps,
  scale: number,
): FabricGroupObject {
  if (!Number.isFinite(scale) || scale <= 0) {
    throw new RangeError(`scale must be a positive finite number, received ${String(scale)}`);
  }

  const { cellStyle } = props;
  const matrix = buildMonthMatrix(props.year, props.month, props.weekStart);
  const holidays = resolveHolidays(props.year, props.month, props.holidays);
  const headers = weekdayHeaderLabels(props.weekStart);

  const width = props.widthMm * scale;
  const height = props.heightMm * scale;

  const weekColumnWidth = props.showWeekNumbers
    ? ((props.widthMm * scale) / (7 + WEEK_COLUMN_RATIO)) * WEEK_COLUMN_RATIO
    : 0;
  const columnWidth = (width - weekColumnWidth) / 7;

  const headerFontSize = cellStyle.headerFontSizeMm * scale;
  const dayFontSize = cellStyle.dayFontSizeMm * scale;
  const holidayFontSize = cellStyle.holidayNameFontSizeMm * scale;

  const headerHeight = headerFontSize * 2.4;
  const rowHeight = (height - headerHeight) / 6;

  const columnCentre = (column: number): number =>
    weekColumnWidth + columnWidth * column + columnWidth / 2;

  const objects: FabricObject[] = [];

  // Weekday headers first, so the printed order and the object order agree.
  headers.forEach((label, column) => {
    objects.push({
      type: 'Text',
      id: `header-${String(column)}`,
      text: label,
      left: round(columnCentre(column)),
      top: round(headerHeight * 0.2),
      fontSize: round(headerFontSize),
      fontFamily: props.fontFamily,
      fontWeight: 600,
      // The Sunday column header is red wherever the week starts.
      fill: isSundayColumn(column, props.weekStart) ? props.holidayColor : cellStyle.textColor,
      textAlign: 'center',
      originX: 'center',
      originY: 'top',
    });
  });

  objects.push({
    type: 'Line',
    id: 'rule-header',
    x1: 0,
    y1: round(headerHeight),
    x2: round(width),
    y2: round(headerHeight),
    stroke: cellStyle.textColor,
    strokeWidth: round(0.3 * scale),
  });

  matrix.forEach((row, rowIndex) => {
    const rowTop = headerHeight + rowHeight * rowIndex;

    if (rowIndex > 0) {
      objects.push({
        type: 'Line',
        id: `rule-row-${String(rowIndex)}`,
        x1: 0,
        y1: round(rowTop),
        x2: round(width),
        y2: round(rowTop),
        stroke: cellStyle.ruleColor,
        strokeWidth: round(0.15 * scale),
      });
    }

    if (props.showWeekNumbers) {
      objects.push({
        type: 'Text',
        id: `week-${String(rowIndex)}`,
        text: String(isoWeekNumber(row[0]!.date)),
        left: round(weekColumnWidth / 2),
        top: round(rowTop + rowHeight * 0.3),
        fontSize: round(holidayFontSize * 1.4),
        fontFamily: props.fontFamily,
        fontWeight: 400,
        fill: cellStyle.mutedColor,
        textAlign: 'center',
        originX: 'center',
        originY: 'top',
      });
    }

    row.forEach((cell, column) => {
      const centre = columnCentre(column);
      const red = isRedDate(cell, holidays);

      objects.push({
        type: 'Text',
        id: `day-${cell.date}`,
        text: String(cell.day),
        left: round(centre),
        top: round(rowTop + rowHeight * 0.22),
        fontSize: round(dayFontSize),
        fontFamily: props.fontFamily,
        fontWeight: red ? 500 : 400,
        fill: !cell.inMonth ? cellStyle.mutedColor : red ? props.holidayColor : cellStyle.textColor,
        textAlign: 'center',
        originX: 'center',
        originY: 'top',
      });

      if (!hasHoliday(cell, holidays)) return;

      const entries = holidays.get(cell.date) ?? [];

      // The marker dot, so a holiday reads as one even in monochrome print.
      const markerSize = 0.5 * scale;
      objects.push({
        type: 'Rect',
        id: `marker-${cell.date}`,
        left: round(centre),
        top: round(rowTop + rowHeight * 0.22 + dayFontSize * 1.15),
        width: round(markerSize),
        height: round(markerSize),
        rx: round(markerSize / 2),
        ry: round(markerSize / 2),
        fill: props.holidayColor,
        originX: 'center',
        originY: 'top',
      });

      if (!props.showHolidayNames) return;

      entries.forEach((holiday, index) => {
        objects.push({
          type: 'Text',
          id: `holiday-${cell.date}-${String(index)}`,
          // Verbatim. Never translated (master spec §6.2).
          text: holiday.name,
          left: round(centre),
          top: round(
            rowTop + rowHeight * 0.22 + dayFontSize * 1.5 + holidayFontSize * 1.25 * index,
          ),
          fontSize: round(holidayFontSize),
          fontFamily: props.fontFamily,
          fontWeight: 400,
          fill: holiday.isRedDate ? props.holidayColor : cellStyle.mutedColor,
          textAlign: 'center',
          originX: 'center',
          originY: 'top',
        });
      });
    });
  });

  return {
    type: 'Group',
    id: props.id,
    left: round(props.xMm * scale),
    top: round(props.yMm * scale),
    width: round(width),
    height: round(height),
    originX: 'left',
    originY: 'top',
    objects,
  };
}

function isSundayColumn(column: number, weekStart: CalendarGridObject['weekStart']): boolean {
  return weekStart === 'monday' ? column === 6 : column === 0;
}
