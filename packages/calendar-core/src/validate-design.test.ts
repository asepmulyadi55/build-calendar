import { describe, expect, it } from 'vitest';
import { CURRENT_SCHEMA_VERSION, createCalendarGridObject } from './design.js';
import { DEFAULT_FONT_ID, fontById } from './fonts.js';
import { validateCalendarDesign, type PresetConstraints } from './validate-design.js';

/**
 * P1-US-702: a template is imported from a file, so nothing upstream has checked
 * it. Three rules are named in the story — the JSON conforms to the schema, the
 * sheet count matches the product preset, and every slot has a unique id — and a
 * failure must be reported clearly rather than stored broken.
 *
 * Issues are returned as codes and parameters, never as sentences. The messages a
 * human reads live in `en.ts`; calendar-core stays free of interface copy.
 */
const preset: PresetConstraints = {
  code: 'WALL-12',
  sheetCount: 12,
  widthMm: 297,
  heightMm: 420,
  bleedMm: 3,
  monthsPerSheet: 1,
  hasCover: false,
};

function sheet(index: number, slotIds: string[] = [`photo-${index + 1}`]) {
  return {
    id: `sheet-${String(index + 1).padStart(2, '0')}`,
    index,
    widthMm: preset.widthMm,
    heightMm: preset.heightMm,
    bleedMm: preset.bleedMm,
    safeMarginMm: 10,
    objects: [
      createCalendarGridObject({
        id: `grid-${index + 1}`,
        // Wraps, so a 13-sheet fixture (cover plus twelve months) stays buildable.
        month: (index % 12) + 1,
        year: 2027,
        xMm: 10,
        yMm: 260,
        widthMm: 277,
        heightMm: 140,
      }),
    ],
    slots: slotIds.map((id) => ({
      id,
      type: 'image' as const,
      required: true,
      xMm: 0,
      yMm: 0,
      widthMm: 303,
      heightMm: 249,
    })),
  };
}

function design(overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    productPresetCode: 'WALL-12',
    year: 2027,
    startMonth: 1,
    sheets: Array.from({ length: 12 }, (_, index) => sheet(index)),
    ...overrides,
  };
}

const codes = (result: ReturnType<typeof validateCalendarDesign>) =>
  result.issues.map((issue) => issue.code);

describe('validateCalendarDesign', () => {
  it('accepts a design that matches its preset', () => {
    const result = validateCalendarDesign(design(), preset);
    expect(result.issues).toEqual([]);
    expect(result.valid).toBe(true);
  });

  describe('schema conformance', () => {
    it.each([null, undefined, 42, 'a string', []])('rejects %s as a design', (candidate) => {
      const result = validateCalendarDesign(candidate, preset);
      expect(result.valid).toBe(false);
      expect(codes(result)).toContain('notAnObject');
    });

    it('rejects a schemaVersion it does not know', () => {
      const result = validateCalendarDesign(
        design({ schemaVersion: CURRENT_SCHEMA_VERSION + 1 }),
        preset,
      );
      expect(codes(result)).toContain('unsupportedSchemaVersion');
      // The version is reported so the message can name it.
      expect(result.issues[0]?.params?.['version']).toBe(CURRENT_SCHEMA_VERSION + 1);
    });

    it('rejects a missing schemaVersion — a file with no version can never be migrated', () => {
      const { schemaVersion: _omitted, ...withoutVersion } = design();
      expect(codes(validateCalendarDesign(withoutVersion, preset))).toContain(
        'unsupportedSchemaVersion',
      );
    });

    it.each(['year', 'startMonth', 'sheets', 'productPresetCode'])(
      'rejects a missing %s',
      (field) => {
        const incomplete = design();
        delete (incomplete as Record<string, unknown>)[field];
        expect(codes(validateCalendarDesign(incomplete, preset))).toContain('missingField');
      },
    );

    it('rejects a startMonth outside 1-12', () => {
      expect(codes(validateCalendarDesign(design({ startMonth: 0 }), preset))).toContain(
        'invalidField',
      );
      expect(codes(validateCalendarDesign(design({ startMonth: 13 }), preset))).toContain(
        'invalidField',
      );
    });

    it('rejects a sheet that is not an object', () => {
      expect(codes(validateCalendarDesign(design({ sheets: [1, 2, 3] }), preset))).toContain(
        'invalidField',
      );
    });

    it('reports the path of the offending sheet, so an admin can find it', () => {
      const broken = design();
      (broken.sheets[4] as Record<string, unknown>)['widthMm'] = 'wide';
      const result = validateCalendarDesign(broken, preset);
      expect(result.issues.some((issue) => issue.path === 'sheets[4].widthMm')).toBe(true);
    });
  });

  describe('sheet count matches the preset', () => {
    it('rejects too few sheets', () => {
      const result = validateCalendarDesign(
        design({ sheets: Array.from({ length: 11 }, (_, index) => sheet(index)) }),
        preset,
      );
      expect(codes(result)).toContain('sheetCountMismatch');
      expect(result.issues[0]?.params).toMatchObject({ expected: 12, actual: 11 });
    });

    it('rejects too many sheets', () => {
      const result = validateCalendarDesign(
        design({ sheets: Array.from({ length: 13 }, (_, index) => sheet(index)) }),
        preset,
      );
      expect(codes(result)).toContain('sheetCountMismatch');
    });

    it('counts the cover when the preset has one', () => {
      // A 13-sheet desk calendar is a cover plus twelve months.
      const desk: PresetConstraints = {
        code: 'DESK-A5L',
        sheetCount: 13,
        widthMm: 210,
        heightMm: 148,
        bleedMm: 3,
        monthsPerSheet: 1,
        hasCover: true,
      };

      const thirteen = {
        ...design({ productPresetCode: 'DESK-A5L' }),
        sheets: Array.from({ length: 13 }, (_, index) => ({
          ...sheet(index),
          widthMm: desk.widthMm,
          heightMm: desk.heightMm,
        })),
      };

      expect(validateCalendarDesign(thirteen, desk).valid).toBe(true);
    });

    it('rejects a sheet whose trim size is not the preset trim size', () => {
      const wrong = design();
      (wrong.sheets[0] as Record<string, unknown>)['widthMm'] = 300;
      const result = validateCalendarDesign(wrong, preset);
      expect(codes(result)).toContain('sheetSizeMismatch');
    });

    it('rejects a design whose preset code disagrees with the preset it is imported against', () => {
      const result = validateCalendarDesign(design({ productPresetCode: 'WALL-1' }), preset);
      expect(codes(result)).toContain('presetCodeMismatch');
    });
  });

  describe('slot ids', () => {
    it('rejects a duplicate id within one sheet', () => {
      const clash = design({
        sheets: [
          sheet(0, ['photo-1', 'photo-1']),
          ...Array.from({ length: 11 }, (_, index) => sheet(index + 1)),
        ],
      });

      const result = validateCalendarDesign(clash, preset);
      expect(codes(result)).toContain('duplicateSlotId');
      expect(result.issues[0]?.params?.['slotId']).toBe('photo-1');
    });

    it('rejects a duplicate id across different sheets', () => {
      // Slot ids address a user's uploaded photo, so two sheets sharing one id
      // means one photo silently overwrites another.
      const clash = design({
        sheets: [
          sheet(0, ['shared']),
          sheet(1, ['shared']),
          ...Array.from({ length: 10 }, (_, index) => sheet(index + 2)),
        ],
      });

      expect(codes(validateCalendarDesign(clash, preset))).toContain('duplicateSlotId');
    });

    it('rejects an empty or whitespace id', () => {
      const blank = design({
        sheets: [sheet(0, ['  ']), ...Array.from({ length: 11 }, (_, i) => sheet(i + 1))],
      });
      expect(codes(validateCalendarDesign(blank, preset))).toContain('emptySlotId');
    });

    it('rejects a design with no slots at all — nothing for a user to fill', () => {
      const empty = design({
        sheets: Array.from({ length: 12 }, (_, index) => ({ ...sheet(index), slots: [] })),
      });
      expect(codes(validateCalendarDesign(empty, preset))).toContain('noSlots');
    });

    it('accepts the same id appearing once per sheet when sheets are independent', () => {
      const unique = design({
        sheets: Array.from({ length: 12 }, (_, index) => sheet(index, [`photo-${index + 1}`])),
      });
      expect(validateCalendarDesign(unique, preset).valid).toBe(true);
    });
  });

  describe('fonts and calendar grids', () => {
    it('rejects a font that is not on the renderer allowlist', () => {
      const badFont = design();
      const grid = (badFont.sheets[0] as { objects: Record<string, unknown>[] }).objects[0]!;
      grid['fontFamily'] = 'Comic Sans MS';

      const result = validateCalendarDesign(badFont, preset);
      expect(codes(result)).toContain('unknownFont');
      expect(result.issues[0]?.params?.['fontFamily']).toBe('Comic Sans MS');
    });

    it('accepts every font that is on the allowlist', () => {
      const good = design();
      const grid = (good.sheets[0] as { objects: Record<string, unknown>[] }).objects[0]!;
      grid['fontFamily'] = fontById(DEFAULT_FONT_ID).family;
      expect(validateCalendarDesign(good, preset).valid).toBe(true);
    });

    it('rejects a calendar grid whose month is out of range', () => {
      const badMonth = design();
      const grid = (badMonth.sheets[0] as { objects: Record<string, unknown>[] }).objects[0]!;
      grid['month'] = 13;
      expect(codes(validateCalendarDesign(badMonth, preset))).toContain('invalidMonth');
    });

    it('rejects a locale that is not id-ID — the printed sheet is Indonesian', () => {
      const badLocale = design();
      const grid = (badLocale.sheets[0] as { objects: Record<string, unknown>[] }).objects[0]!;
      grid['locale'] = 'en-US';
      expect(codes(validateCalendarDesign(badLocale, preset))).toContain('invalidLocale');
    });
  });

  it('collects every problem rather than stopping at the first', () => {
    // An admin fixing one error at a time across twelve sheets is a bad afternoon.
    const messy = design({
      schemaVersion: 99,
      sheets: [sheet(0, ['dup']), sheet(1, ['dup'])],
    });

    const result = validateCalendarDesign(messy, preset);
    expect(result.issues.length).toBeGreaterThan(2);
    expect(codes(result)).toEqual(
      expect.arrayContaining(['unsupportedSchemaVersion', 'sheetCountMismatch', 'duplicateSlotId']),
    );
  });

  it('derives the slot schema from a valid design', () => {
    const result = validateCalendarDesign(design(), preset);
    expect(result.slotSchema?.slots).toHaveLength(12);
    expect(result.slotSchema?.slots[0]).toMatchObject({
      id: 'photo-1',
      type: 'image',
      required: true,
    });
  });

  it('returns no slot schema when the design is invalid', () => {
    expect(validateCalendarDesign(design({ schemaVersion: 99 }), preset).slotSchema).toBeNull();
  });
});
