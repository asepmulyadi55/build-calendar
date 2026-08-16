// Indonesian calendar data. Hardcoded id-ID, no locale parameter (master spec 10.7).
// In the real app this lives in packages/calendar-core. Here it is inlined on purpose:
// the spike must not create anything the real app could accidentally depend on.

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
];

// Week starts Monday.
export const WEEKDAYS_ID_SHORT = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

// 2027 national holidays are not seeded here; the spike only needs January.
export const HOLIDAYS_2027_01 = [{ date: '2027-01-01', name: 'Tahun Baru Masehi' }];

const iso = (y, m, d) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

/**
 * 6x7 matrix of cells including leading/trailing days from adjacent months.
 * month is 1-12. Week starts Monday, so column 6 is always Sunday.
 */
export function buildMonthMatrix(year, month) {
  const first = new Date(Date.UTC(year, month - 1, 1));
  // getUTCDay: 0=Sunday. Monday-start offset.
  const leading = (first.getUTCDay() + 6) % 7;

  const cells = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(Date.UTC(year, month - 1, 1 - leading + i));
    const y = d.getUTCFullYear();
    const m = d.getUTCMonth() + 1;
    const day = d.getUTCDate();
    cells.push({
      day,
      date: iso(y, m, day),
      inMonth: m === month && y === year,
      isSunday: d.getUTCDay() === 0,
    });
  }

  const matrix = [];
  for (let r = 0; r < 6; r++) matrix.push(cells.slice(r * 7, r * 7 + 7));
  return matrix;
}

export function resolveHolidays(holidays) {
  const map = new Map();
  for (const h of holidays) {
    if (!map.has(h.date)) map.set(h.date, []);
    map.get(h.date).push(h);
  }
  return map;
}
