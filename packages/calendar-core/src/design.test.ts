import { describe, expect, it } from 'vitest';
import {
  CURRENT_SCHEMA_VERSION,
  createCalendarGridObject,
  isCalendarGridObject,
  isSupportedSchemaVersion,
  type CalendarDesign,
} from './design';
import { DEFAULT_FONT_ID, fontById } from './fonts';

const design: CalendarDesign = {
  schemaVersion: CURRENT_SCHEMA_VERSION,
  productPresetCode: 'WALL-12',
  year: 2027,
  startMonth: 1,
  sheets: [
    {
      id: 'sheet-01',
      index: 0,
      widthMm: 297,
      heightMm: 420,
      bleedMm: 3,
      safeMarginMm: 10,
      objects: [],
      slots: [
        {
          id: 'photo-1',
          type: 'image',
          required: true,
          xMm: 0,
          yMm: 0,
          widthMm: 303,
          heightMm: 249,
        },
      ],
    },
  ],
};

describe('Design JSON', () => {
  it('carries a schemaVersion', () => {
    expect(design.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(typeof CURRENT_SCHEMA_VERSION).toBe('number');
  });

  it('recognises the current version and rejects a future one', () => {
    expect(isSupportedSchemaVersion(CURRENT_SCHEMA_VERSION)).toBe(true);
    expect(isSupportedSchemaVersion(CURRENT_SCHEMA_VERSION + 1)).toBe(false);
    expect(isSupportedSchemaVersion(0)).toBe(false);
  });

  it('stores every coordinate in millimetres', () => {
    const slot = design.sheets[0]!.slots[0]!;
    // Trim 297 x 420 plus 3 mm bleed on each side: a full-bleed slot is 303 wide.
    expect(slot.widthMm).toBe(design.sheets[0]!.widthMm + design.sheets[0]!.bleedMm * 2);
  });
});

describe('createCalendarGridObject', () => {
  it('is locked to id-ID', () => {
    const grid = createCalendarGridObject({
      id: 'g',
      month: 1,
      year: 2027,
      xMm: 0,
      yMm: 0,
      widthMm: 100,
      heightMm: 50,
    });

    expect(grid.locale).toBe('id-ID');
  });

  it('defaults the week start to Monday', () => {
    const grid = createCalendarGridObject({
      id: 'g',
      month: 1,
      year: 2027,
      xMm: 0,
      yMm: 0,
      widthMm: 100,
      heightMm: 50,
    });

    expect(grid.weekStart).toBe('monday');
  });

  it('defaults the font to one on the allowlist', () => {
    const grid = createCalendarGridObject({
      id: 'g',
      month: 1,
      year: 2027,
      xMm: 0,
      yMm: 0,
      widthMm: 100,
      heightMm: 50,
    });

    expect(grid.fontFamily).toBe(fontById(DEFAULT_FONT_ID).family);
  });

  it('rejects a font that is not on the allowlist', () => {
    expect(() =>
      createCalendarGridObject({
        id: 'g',
        month: 1,
        year: 2027,
        xMm: 0,
        yMm: 0,
        widthMm: 100,
        heightMm: 50,
        fontFamily: 'Comic Sans MS',
      }),
    ).toThrow(/allowlist/i);
  });

  it('is identified by its type discriminant', () => {
    const grid = createCalendarGridObject({
      id: 'g',
      month: 1,
      year: 2027,
      xMm: 0,
      yMm: 0,
      widthMm: 100,
      heightMm: 50,
    });

    expect(isCalendarGridObject(grid)).toBe(true);
    expect(isCalendarGridObject({ type: 'image' })).toBe(false);
    expect(isCalendarGridObject(null)).toBe(false);
  });
});
