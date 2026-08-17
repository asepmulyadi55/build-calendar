import type { CalendarDesign, Sheet } from '@buildcalendar/calendar-core';

/**
 * A sheet, drawn to scale, so an admin can see what they are about to activate
 * (P1-US-702).
 *
 * Deliberately a schematic and not a render: the real renderer is P1-US-601 and
 * there must only ever be one (AR-01). What this answers is "is the layout
 * coherent" — are the slots where the designer meant, does anything sit outside
 * the safe area, is the calendar grid on the sheet at all.
 *
 * Everything is in millimetres and the SVG viewBox is the trim size plus bleed, so
 * the drawing is the sheet at 1:1 in its own units.
 */
export function SheetSchematic({ sheet }: { sheet: Sheet }) {
  const width = sheet.widthMm + sheet.bleedMm * 2;
  const height = sheet.heightMm + sheet.bleedMm * 2;
  const safe = sheet.bleedMm + sheet.safeMarginMm;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={sheet.id}>
      <rect x={0} y={0} width={width} height={height} fill="var(--color-surface)" />

      {/* Trim line, then the safe area. Anything important outside the inner box
          risks being cut off (VLD-SAFE). */}
      <rect
        x={sheet.bleedMm}
        y={sheet.bleedMm}
        width={sheet.widthMm}
        height={sheet.heightMm}
        fill="none"
        stroke="var(--ink-25)"
        strokeWidth={0.5}
      />
      <rect
        x={safe}
        y={safe}
        width={width - safe * 2}
        height={height - safe * 2}
        fill="none"
        stroke="var(--rule)"
        strokeWidth={0.4}
        strokeDasharray="3 3"
      />

      {sheet.slots.map((slot) => (
        <g key={slot.id}>
          <rect
            x={slot.xMm}
            y={slot.yMm}
            width={slot.widthMm}
            height={slot.heightMm}
            fill="var(--paper-2)"
            stroke="var(--ink-45)"
            strokeWidth={0.5}
          />
          <text
            x={slot.xMm + slot.widthMm / 2}
            y={slot.yMm + slot.heightMm / 2}
            textAnchor="middle"
            fontSize={Math.min(8, slot.widthMm / 8)}
            fill="var(--ink-45)"
            fontFamily="var(--f-mono)"
          >
            {slot.id}
          </text>
        </g>
      ))}

      {sheet.objects
        .filter((object) => object.type === 'calendarGrid')
        .map((grid) => (
          <rect
            key={grid.id}
            x={grid.xMm}
            y={grid.yMm}
            width={grid.widthMm}
            height={grid.heightMm}
            fill="none"
            stroke="var(--merah)"
            strokeWidth={0.5}
          />
        ))}
    </svg>
  );
}

export function DesignSchematic({ design, label }: { design: CalendarDesign; label: string }) {
  return (
    <div className="admin-sheets">
      {design.sheets.map((sheet, index) => (
        <div className="admin-sheet" key={sheet.id}>
          <SheetSchematic sheet={sheet} />
          <div className="l">{label.replace('{index}', String(index + 1))}</div>
        </div>
      ))}
    </div>
  );
}
