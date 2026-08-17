/**
 * Design JSON validation (P1-US-702).
 *
 * A template is authored as a file and imported by hand, so nothing upstream has
 * checked it. Storing a broken one is worse than refusing it: the failure surfaces
 * later as a user's calendar that cannot be exported, long after the admin has
 * forgotten what they uploaded.
 *
 * Issues are returned as codes and parameters, never as sentences. Interface copy
 * lives in `en.ts`; this package holds no English for a human to read
 * (master §10.7).
 *
 * Every problem is collected rather than throwing on the first, because fixing a
 * twelve-sheet template one error per attempt is a bad afternoon.
 */
import { CURRENT_SCHEMA_VERSION, isSupportedSchemaVersion, type SlotDefinition } from './design';
import { CALENDAR_LOCALE } from './locale';
import { isAllowedFontFamily } from './fonts';

export type ValidationCode =
  | 'notAnObject'
  | 'unsupportedSchemaVersion'
  | 'missingField'
  | 'invalidField'
  | 'presetCodeMismatch'
  | 'sheetCountMismatch'
  | 'sheetSizeMismatch'
  | 'duplicateSlotId'
  | 'emptySlotId'
  | 'noSlots'
  | 'unknownFont'
  | 'invalidMonth'
  | 'invalidLocale';

export interface ValidationIssue {
  code: ValidationCode;
  /** Where the problem is, e.g. `sheets[4].widthMm`. Absent for whole-file issues. */
  path?: string;
  params?: Record<string, string | number>;
}

/** What the design is being validated against — a row from `product_presets`. */
export interface PresetConstraints {
  code: string;
  sheetCount: number;
  widthMm: number;
  heightMm: number;
  bleedMm: number;
  monthsPerSheet: number;
  hasCover: boolean;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
  /** Derived from the design when it is valid; `templates.slot_schema` stores it. */
  slotSchema: { slots: SlotDefinition[] } | null;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

export function validateCalendarDesign(
  candidate: unknown,
  preset: PresetConstraints,
): ValidationResult {
  const issues: ValidationIssue[] = [];
  const fail = (code: ValidationCode, path?: string, params?: ValidationIssue['params']) => {
    issues.push({ code, ...(path ? { path } : {}), ...(params ? { params } : {}) });
  };

  if (!isRecord(candidate)) {
    return { valid: false, issues: [{ code: 'notAnObject' }], slotSchema: null };
  }

  // ── Schema version ──────────────────────────────────────────────────────────
  const version = candidate['schemaVersion'];
  if (typeof version !== 'number' || !isSupportedSchemaVersion(version)) {
    fail('unsupportedSchemaVersion', 'schemaVersion', {
      version: typeof version === 'number' ? version : -1,
      supported: CURRENT_SCHEMA_VERSION,
    });
  }

  // ── Top-level fields ────────────────────────────────────────────────────────
  for (const field of ['productPresetCode', 'year', 'startMonth', 'sheets'] as const) {
    if (candidate[field] === undefined) fail('missingField', field);
  }

  if (candidate['productPresetCode'] !== undefined) {
    if (typeof candidate['productPresetCode'] !== 'string') {
      fail('invalidField', 'productPresetCode');
    } else if (candidate['productPresetCode'] !== preset.code) {
      fail('presetCodeMismatch', 'productPresetCode', {
        expected: preset.code,
        actual: candidate['productPresetCode'],
      });
    }
  }

  if (candidate['year'] !== undefined && !Number.isInteger(candidate['year'])) {
    fail('invalidField', 'year');
  }

  const startMonth = candidate['startMonth'];
  if (
    startMonth !== undefined &&
    (!Number.isInteger(startMonth) || (startMonth as number) < 1 || (startMonth as number) > 12)
  ) {
    fail('invalidField', 'startMonth');
  }

  // ── Sheets ──────────────────────────────────────────────────────────────────
  const sheets = candidate['sheets'];
  if (sheets !== undefined && !Array.isArray(sheets)) {
    fail('invalidField', 'sheets');
    return { valid: false, issues, slotSchema: null };
  }

  const sheetList: unknown[] = Array.isArray(sheets) ? sheets : [];

  if (sheetList.length !== preset.sheetCount) {
    fail('sheetCountMismatch', 'sheets', {
      expected: preset.sheetCount,
      actual: sheetList.length,
    });
  }

  const seenSlotIds = new Set<string>();
  const slotSchema: SlotDefinition[] = [];

  sheetList.forEach((rawSheet, index) => {
    const at = `sheets[${index}]`;

    if (!isRecord(rawSheet)) {
      fail('invalidField', at);
      return;
    }

    for (const field of ['widthMm', 'heightMm', 'bleedMm', 'safeMarginMm'] as const) {
      if (!isFiniteNumber(rawSheet[field])) fail('invalidField', `${at}.${field}`);
    }

    // Trim size is the preset's, not the designer's. A sheet that disagrees would
    // export at the wrong page size and no print shop would catch it for us.
    if (
      isFiniteNumber(rawSheet['widthMm']) &&
      isFiniteNumber(rawSheet['heightMm']) &&
      (rawSheet['widthMm'] !== preset.widthMm || rawSheet['heightMm'] !== preset.heightMm)
    ) {
      fail('sheetSizeMismatch', at, {
        expectedWidthMm: preset.widthMm,
        expectedHeightMm: preset.heightMm,
        actualWidthMm: rawSheet['widthMm'],
        actualHeightMm: rawSheet['heightMm'],
      });
    }

    validateObjects(rawSheet['objects'], at, fail);
    collectSlots(rawSheet['slots'], at, fail, seenSlotIds, slotSchema);
  });

  if (slotSchema.length === 0 && issues.every((issue) => issue.code !== 'invalidField')) {
    fail('noSlots', 'sheets');
  }

  const valid = issues.length === 0;
  return { valid, issues, slotSchema: valid ? { slots: slotSchema } : null };
}

function validateObjects(
  objects: unknown,
  at: string,
  fail: (code: ValidationCode, path?: string, params?: ValidationIssue['params']) => void,
): void {
  if (objects === undefined) return;
  if (!Array.isArray(objects)) {
    fail('invalidField', `${at}.objects`);
    return;
  }

  objects.forEach((object, index) => {
    const objectAt = `${at}.objects[${index}]`;
    if (!isRecord(object)) {
      fail('invalidField', objectAt);
      return;
    }

    // A font missing from the renderer image substitutes silently, and the PDF
    // stops matching the preview (§5.5).
    const fontFamily = object['fontFamily'];
    if (typeof fontFamily === 'string' && !isAllowedFontFamily(fontFamily)) {
      fail('unknownFont', `${objectAt}.fontFamily`, { fontFamily });
    }

    if (object['type'] !== 'calendarGrid') return;

    const month = object['month'];
    if (!Number.isInteger(month) || (month as number) < 1 || (month as number) > 12) {
      fail('invalidMonth', `${objectAt}.month`, {
        month: typeof month === 'number' ? month : -1,
      });
    }

    // The printed sheet is Indonesian and only Indonesian (master §10.7).
    if (object['locale'] !== undefined && object['locale'] !== CALENDAR_LOCALE) {
      fail('invalidLocale', `${objectAt}.locale`, { expected: CALENDAR_LOCALE });
    }
  });
}

function collectSlots(
  slots: unknown,
  at: string,
  fail: (code: ValidationCode, path?: string, params?: ValidationIssue['params']) => void,
  seen: Set<string>,
  into: SlotDefinition[],
): void {
  if (slots === undefined) return;
  if (!Array.isArray(slots)) {
    fail('invalidField', `${at}.slots`);
    return;
  }

  slots.forEach((slot, index) => {
    const slotAt = `${at}.slots[${index}]`;
    if (!isRecord(slot)) {
      fail('invalidField', slotAt);
      return;
    }

    const id = typeof slot['id'] === 'string' ? slot['id'].trim() : '';
    if (id.length === 0) {
      fail('emptySlotId', `${slotAt}.id`);
      return;
    }

    // Slot ids address a user's uploaded photo. Two slots sharing one means a
    // photo silently overwrites another.
    if (seen.has(id)) {
      fail('duplicateSlotId', `${slotAt}.id`, { slotId: id });
      return;
    }
    seen.add(id);

    if (slot['type'] !== 'image' && slot['type'] !== 'text') {
      fail('invalidField', `${slotAt}.type`);
      return;
    }

    for (const field of ['xMm', 'yMm', 'widthMm', 'heightMm'] as const) {
      if (!isFiniteNumber(slot[field])) {
        fail('invalidField', `${slotAt}.${field}`);
        return;
      }
    }

    into.push({
      id,
      type: slot['type'],
      required: slot['required'] !== false,
      ...(typeof slot['label'] === 'string' ? { label: slot['label'] } : {}),
      ...(isFiniteNumber(slot['maxLength']) ? { maxLength: slot['maxLength'] } : {}),
      xMm: slot['xMm'] as number,
      yMm: slot['yMm'] as number,
      widthMm: slot['widthMm'] as number,
      heightMm: slot['heightMm'] as number,
    });
  });
}
