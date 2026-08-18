'use client';

import {
  MONTHS_ID,
  buildMonthMatrix,
  hasHoliday,
  holidayLegendEntries,
  isRedDate,
  resolveHolidays,
  weekdayHeaderLabels,
  type Holiday,
  type Sheet,
} from '@buildcalendar/calendar-core';
import type { SlotValue } from '@/lib/editor/state';
import { en } from '@/lib/i18n/en';
import { routes } from '@/lib/routes';

/**
 * The sheet being edited, drawn to scale.
 *
 * The calendar grid comes from `calendar-core` — the same engine the renderer
 * uses (AR-01) — and always renders Bahasa Indonesia, whatever language the
 * interface is in (master §10.7). It is never an image.
 *
 * Only slots listed in `slot_schema` respond to a click. Everything else belongs
 * to the template author and is not selectable, which is enforced by not attaching
 * a handler at all rather than by ignoring the event.
 */
interface SheetCanvasProps {
  sheet: Sheet;
  year: number;
  values: Record<string, SlotValue>;
  editableSlotIds: string[];
  selectedSlotId: string | null;
  onSelectSlot: (slotId: string) => void;
  holidays: Holiday[];
  sheetCount: number;
}

export function SheetCanvas({
  sheet,
  year,
  values,
  editableSlotIds,
  selectedSlotId,
  onSelectSlot,
  holidays,
  sheetCount,
}: SheetCanvasProps) {
  const width = sheet.widthMm + sheet.bleedMm * 2;
  const height = sheet.heightMm + sheet.bleedMm * 2;

  const grid = sheet.objects.find((object) => object.type === 'calendarGrid');
  const month = grid?.type === 'calendarGrid' ? grid.month : 1;

  // The week start comes from the design, never from a default here — the canvas
  // and the renderer must build the same grid (AR-01).
  const weekStart = grid?.type === 'calendarGrid' ? grid.weekStart : undefined;

  const matrix = buildMonthMatrix(year, month, weekStart);
  const resolved = resolveHolidays(year, month, holidays);
  const headers = weekdayHeaderLabels(weekStart);
  const legend = holidayLegendEntries(resolved);

  return (
    <div className="sheet ed-sheet">
      <span className="cm-b" />
      <div className="cal filled ed-cal">
        {/* Photo slots. A filled one shows the preview derivative, fitted the way
            the export will fit it — the editor and the renderer must agree (AR-01). */}
        {sheet.slots
          .filter((slot) => slot.type === 'image')
          .map((slot) => {
            const editable = editableSlotIds.includes(slot.id);
            const value = values[slot.id];
            const photo = value && 'assetId' in value ? value : undefined;

            const className = [
              'cal-photo',
              'ed-slot',
              photo ? 'ed-slot-filled' : null,
              editable ? 'ed-slot-editable' : null,
              selectedSlotId === slot.id ? 'ed-slot-selected' : null,
            ]
              .filter(Boolean)
              .join(' ');

            const inner = photo ? (
              <img
                className="ed-slot-img"
                src={routes.asset(photo.assetId, 'preview')}
                alt=""
                style={{
                  transform: `translate(${String((photo.panX ?? 0) * 50)}%, ${String(
                    (photo.panY ?? 0) * 50,
                  )}%) scale(${String(photo.zoom ?? 1)}) rotate(${String(photo.rotation ?? 0)}deg)`,
                }}
              />
            ) : (
              <>
                <div className="ph" />
                <div className="slot-hint">
                  <span className="mono">{slot.id}</span>
                  <b>{en.editor.slotEmpty}</b>
                </div>
              </>
            );

            // A locked object is a plain div — not a disabled button, which would
            // still be focusable in some browsers.
            return editable ? (
              <button
                type="button"
                key={slot.id}
                className={className}
                onClick={() => onSelectSlot(slot.id)}
                aria-pressed={selectedSlotId === slot.id}
              >
                {inner}
              </button>
            ) : (
              <div key={slot.id} className={className}>
                {inner}
              </div>
            );
          })}

        <div className="cal-body">
          <div className="cal-head">
            {/* Printed output: Indonesian, from calendar-core. */}
            <div className="cal-month">{MONTHS_ID[month - 1]}</div>
            <div className="cal-year">
              {year} · {String(sheet.index + 1).padStart(2, '0')}/
              {String(sheet.index + 1 > sheetCount ? sheet.index + 1 : sheetCount).padStart(2, '0')}
            </div>
          </div>

          <table className="grid">
            <thead>
              <tr>
                {headers.map((label) => (
                  <th key={label}>{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Every row. A month can need six — May 2027 starts on a Saturday,
                  and truncating to five silently loses 31 May. */}
              {matrix.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell) => {
                    const classes = [
                      !cell.inMonth ? 'mute' : null,
                      cell.inMonth && hasHoliday(cell, resolved) ? 'mark' : null,
                      cell.inMonth && !hasHoliday(cell, resolved) && isRedDate(cell, resolved)
                        ? 'red'
                        : null,
                    ]
                      .filter(Boolean)
                      .join(' ');

                    return (
                      <td key={cell.date} className={classes || undefined}>
                        {cell.day}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>

          {/* The holiday legend, printed exactly as `1 Jan — Tahun Baru Masehi`.
              Joint leave (*cuti bersama*) carries its own marker and its own legend
              entry, because it is a different kind of day off (P1-US-305). */}
          {legend.length > 0 && (
            <div className="legend">
              {legend.map((entry) => (
                <span
                  key={`${entry.date}-${entry.name}`}
                  className={entry.type === 'joint_leave' ? 'legend-joint' : undefined}
                >
                  <i aria-hidden="true" />
                  {entry.line}
                </span>
              ))}
              {legend.some((entry) => entry.type === 'joint_leave') && (
                <span className="legend-key legend-joint">
                  <i aria-hidden="true" />
                  {en.editor.jointLeaveKey}
                </span>
              )}
            </div>
          )}

          {/* Text slots render under the grid, where the template puts captions. */}
          {sheet.slots
            .filter((slot) => slot.type === 'text')
            .map((slot) => {
              const value = values[slot.id];
              const text = value && 'text' in value ? value.text : '';
              const editable = editableSlotIds.includes(slot.id);

              return editable ? (
                <button
                  type="button"
                  key={slot.id}
                  className={
                    selectedSlotId === slot.id
                      ? 'ed-text-slot ed-slot-editable ed-slot-selected'
                      : 'ed-text-slot ed-slot-editable'
                  }
                  onClick={() => onSelectSlot(slot.id)}
                >
                  {text || en.editor.textSlotEmpty}
                </button>
              ) : (
                <div key={slot.id} className="ed-text-slot">
                  {text}
                </div>
              );
            })}
        </div>
      </div>
      <p className="spec">
        {sheet.widthMm} × {sheet.heightMm} MM · BLEED {sheet.bleedMm} MM · {width} × {height} MM
      </p>
    </div>
  );
}
