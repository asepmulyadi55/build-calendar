import { describe, expect, it } from 'vitest';
import { renderCalendarGridToFabric, type FabricObject } from './fabric-grid';
import { createCalendarGridObject } from './design';
import type { Holiday } from './holidays';

const holidays: Holiday[] = [
  {
    date: '2027-01-01',
    name: 'Tahun Baru Masehi',
    type: 'national',
    year: 2027,
    isRedDate: true,
  },
];

const grid = createCalendarGridObject({
  id: 'grid-1',
  month: 1,
  year: 2027,
  xMm: 10,
  yMm: 260,
  widthMm: 277,
  heightMm: 140,
});

const texts = (objects: readonly FabricObject[]) =>
  objects.filter((o) => o.type === 'Text').map((o) => (o as { text: string }).text);

/**
 * P1-US-305: joint leave days (*cuti bersama*) must be styled distinctly from
 * national holidays. They are non-working days, so they stay red — but a reader
 * planning time off needs to tell the two apart at a glance, and on a monochrome
 * print the colour is gone. The distinction is therefore the marker's shape:
 * solid for a national holiday, hollow ring for joint leave alone.
 */
const jointLeaveHolidays: Holiday[] = [
  ...holidays,
  {
    date: '2027-01-08',
    name: 'Cuti Bersama Tahun Baru Imlek',
    type: 'joint_leave',
    year: 2027,
    isRedDate: true,
  },
];

const markerFor = (objects: readonly FabricObject[], date: string) =>
  objects.find((o) => o.type === 'Rect' && o.id === `marker-${date}`) as
    | { fill: string; stroke?: string; strokeWidth?: number }
    | undefined;

describe('joint leave days', () => {
  it('renders a hollow marker, where a national holiday is solid', () => {
    const group = renderCalendarGridToFabric({ ...grid, holidays: jointLeaveHolidays }, 1);

    const national = markerFor(group.objects, '2027-01-01');
    const jointLeave = markerFor(group.objects, '2027-01-08');

    expect(national).toBeDefined();
    expect(jointLeave).toBeDefined();

    // Solid: filled with the holiday colour, no outline needed.
    expect(national!.fill).toBe(grid.holidayColor);

    // Hollow: no fill, outlined in the same colour.
    expect(jointLeave!.fill).toBe('transparent');
    expect(jointLeave!.stroke).toBe(grid.holidayColor);
    expect(jointLeave!.strokeWidth).toBeGreaterThan(0);
  });

  it('keeps the solid marker when a national holiday shares the date', () => {
    const sameDate: Holiday[] = [
      ...holidays,
      {
        date: '2027-01-01',
        name: 'Cuti Bersama Tahun Baru',
        type: 'joint_leave',
        year: 2027,
        isRedDate: true,
      },
    ];

    const group = renderCalendarGridToFabric({ ...grid, holidays: sameDate }, 1);

    // The national holiday is what the reader is looking for, so it wins.
    expect(markerFor(group.objects, '2027-01-01')!.fill).toBe(grid.holidayColor);
  });

  it('still prints the joint leave name verbatim', () => {
    const group = renderCalendarGridToFabric(
      { ...grid, holidays: jointLeaveHolidays, showHolidayNames: true },
      1,
    );

    expect(texts(group.objects)).toContain('Cuti Bersama Tahun Baru Imlek');
  });
});

describe('renderCalendarGridToFabric', () => {
  it('returns a Fabric group', () => {
    const group = renderCalendarGridToFabric({ ...grid, holidays }, 1);

    expect(group.type).toBe('Group');
    expect(Array.isArray(group.objects)).toBe(true);
    expect(group.objects.length).toBeGreaterThan(0);
  });

  it('emits only Fabric v6 class names as object types', () => {
    const group = renderCalendarGridToFabric({ ...grid, holidays }, 1);
    const allowed = new Set(['Text', 'Line', 'Rect']);

    for (const object of group.objects) {
      expect(allowed.has(object.type), object.type).toBe(true);
    }
  });

  it('prints Indonesian weekday headers, Monday first', () => {
    const group = renderCalendarGridToFabric({ ...grid, holidays }, 1);
    const labels = texts(group.objects).slice(0, 7);

    expect(labels).toEqual(['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']);
  });

  it('rotates the headers when the grid is set to a Sunday start', () => {
    const sundayGrid = createCalendarGridObject({ ...grid, weekStart: 'sunday' });
    const group = renderCalendarGridToFabric({ ...sundayGrid, holidays }, 1);

    expect(texts(group.objects).slice(0, 7)).toEqual([
      'Min',
      'Sen',
      'Sel',
      'Rab',
      'Kam',
      'Jum',
      'Sab',
    ]);
  });

  it('renders 42 day numbers', () => {
    const group = renderCalendarGridToFabric({ ...grid, holidays }, 1);
    const dayCells = group.objects.filter((o) => o.type === 'Text' && o.id?.startsWith('day-'));

    expect(dayCells).toHaveLength(42);
  });

  it('colours Sundays and red holidays with the holiday colour', () => {
    const group = renderCalendarGridToFabric({ ...grid, holidays }, 1);
    const byDate = (date: string) =>
      group.objects.find((o) => o.id === `day-${date}`) as { fill: string } | undefined;

    // 1 January 2027 is a Friday and a national holiday.
    expect(byDate('2027-01-01')?.fill).toBe(grid.holidayColor);
    // 3 January 2027 is a Sunday.
    expect(byDate('2027-01-03')?.fill).toBe(grid.holidayColor);
    // 5 January 2027 is an ordinary Tuesday.
    expect(byDate('2027-01-05')?.fill).toBe(grid.cellStyle.textColor);
  });

  it('greys days from the adjacent months', () => {
    const group = renderCalendarGridToFabric({ ...grid, holidays }, 1);
    const leading = group.objects.find((o) => o.id === 'day-2026-12-28') as
      { fill: string } | undefined;

    expect(leading?.fill).toBe(grid.cellStyle.mutedColor);
  });

  it('prints the holiday name under the date when showHolidayNames is on', () => {
    const group = renderCalendarGridToFabric({ ...grid, holidays }, 1);
    expect(texts(group.objects)).toContain('Tahun Baru Masehi');
  });

  it('omits holiday names when the flag is off', () => {
    const quiet = createCalendarGridObject({ ...grid, showHolidayNames: false });
    const group = renderCalendarGridToFabric({ ...quiet, holidays }, 1);

    expect(texts(group.objects)).not.toContain('Tahun Baru Masehi');
  });

  it('adds an ISO week-number column only when asked', () => {
    const off = renderCalendarGridToFabric({ ...grid, holidays }, 1);
    expect(off.objects.some((o) => o.id?.startsWith('week-'))).toBe(false);

    const on = createCalendarGridObject({ ...grid, showWeekNumbers: true });
    const group = renderCalendarGridToFabric({ ...on, holidays }, 1);
    const weeks = group.objects.filter((o) => o.id?.startsWith('week-'));

    expect(weeks).toHaveLength(6);
    // The week containing 1 January 2027 (a Friday) is ISO week 53 of 2026.
    expect((weeks[0] as { text: string }).text).toBe('53');
  });

  it('scales geometry by the px-per-mm factor and nothing else', () => {
    const atOne = renderCalendarGridToFabric({ ...grid, holidays }, 1);
    const atFour = renderCalendarGridToFabric({ ...grid, holidays }, 4);

    expect(atFour.left).toBeCloseTo(atOne.left * 4, 6);
    expect(atFour.width).toBeCloseTo(atOne.width * 4, 6);
    expect(atFour.height).toBeCloseTo(atOne.height * 4, 6);
    expect(atFour.objects).toHaveLength(atOne.objects.length);
    expect(texts(atFour.objects)).toEqual(texts(atOne.objects));
  });

  it('places the group at the object position in millimetres, converted by scale', () => {
    const group = renderCalendarGridToFabric({ ...grid, holidays }, 2);

    expect(group.left).toBe(20);
    expect(group.top).toBe(520);
    expect(group.width).toBe(554);
    expect(group.height).toBe(280);
  });

  it('is deterministic — the same input serialises identically', () => {
    const a = renderCalendarGridToFabric({ ...grid, holidays }, 3);
    const b = renderCalendarGridToFabric({ ...grid, holidays }, 3);

    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('renders without holiday data rather than throwing', () => {
    // The warning is the editor's job (hasHolidayData); the grid still draws.
    const group = renderCalendarGridToFabric({ ...grid, holidays: [] }, 1);
    expect(texts(group.objects)).toContain('Sen');
    expect(texts(group.objects)).not.toContain('Tahun Baru Masehi');
  });

  it.each([0, -1, Number.NaN])('rejects scale %s', (scale) => {
    expect(() => renderCalendarGridToFabric({ ...grid, holidays }, scale as number)).toThrow(
      /scale/i,
    );
  });

  it('carries no font outside the allowlist', () => {
    const group = renderCalendarGridToFabric({ ...grid, holidays }, 1);
    const families = new Set(
      group.objects
        .filter((o) => o.type === 'Text')
        .map((o) => (o as { fontFamily: string }).fontFamily),
    );

    expect(families).toEqual(new Set([grid.fontFamily]));
  });
});
