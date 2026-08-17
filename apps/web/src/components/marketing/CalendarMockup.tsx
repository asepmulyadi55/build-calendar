import {
  MONTHS_ID,
  MONTHS_ID_SHORT,
  buildMonthMatrix,
  formatHolidayLegend,
  hasHoliday,
  isRedDate,
  resolveHolidays,
  weekdayHeaderLabels,
  type Holiday,
} from '@buildcalendar/calendar-core';
import { en } from '@/lib/i18n/en';

/**
 * The hero's calendar sheet.
 *
 * This is a picture of printed output, so every label on it is Bahasa Indonesia and
 * comes from `calendar-core` — the same engine the renderer uses (AR-01). Typing
 * "Januari" into this file would be the first step towards the preview and the PDF
 * disagreeing.
 *
 * The surrounding chrome stays English and comes from `en.ts`.
 */
const YEAR = 2027;
const MONTH = 1;

/**
 * One holiday, so the red date and the legend are real rather than decorative.
 * Seeded holiday data is not read here: the homepage must render for an anonymous
 * visitor even when the database is unreachable, and this is a mockup, not a
 * calendar anyone will print.
 */
const MOCKUP_HOLIDAYS: Holiday[] = [
  {
    date: '2027-01-01',
    name: 'Tahun Baru Masehi',
    type: 'national',
    year: YEAR,
    isRedDate: true,
  },
];

export function CalendarMockup() {
  const matrix = buildMonthMatrix(YEAR, MONTH);
  const holidays = resolveHolidays(YEAR, MONTH, MOCKUP_HOLIDAYS);
  const headers = weekdayHeaderLabels();
  const legend = formatHolidayLegend(holidays);

  return (
    <div className="sheet">
      <span className="cm-b" />
      <div className="cal filled">
        <div className="cal-photo">
          <div className="ph ph-fade" />
          <div className="slot-hint">
            <span className="mono">{en.home.hero.mockupSlotLabel}</span>
            <b>{en.home.hero.mockupSlotTitle}</b>
          </div>
        </div>

        <div className="cal-body">
          <div className="cal-head">
            <div className="cal-month">{MONTHS_ID[MONTH - 1]}</div>
            <div className="cal-year">
              {YEAR} · {en.home.hero.mockupSheetLabel}
            </div>
          </div>

          <div className="months">
            {MONTHS_ID_SHORT.map((month, index) => (
              <span key={month} className={index === MONTH - 1 ? 'on' : undefined}>
                {month.toUpperCase()}
              </span>
            ))}
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
              {matrix.slice(0, 5).map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell) => {
                    const classes = [
                      !cell.inMonth ? 'mute' : null,
                      cell.inMonth && hasHoliday(cell, holidays) ? 'mark' : null,
                      cell.inMonth && !hasHoliday(cell, holidays) && isRedDate(cell, holidays)
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

          {legend.length > 0 && (
            <div className="legend">
              <i className="dot" />
              <span>{legend[0]}</span>
            </div>
          )}
        </div>
      </div>
      <p className="spec">{en.home.hero.mockupSpec}</p>
    </div>
  );
}
