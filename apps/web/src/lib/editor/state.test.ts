import { describe, expect, it } from 'vitest';
import {
  HISTORY_LIMIT,
  canChangeYear,
  createEditorState,
  editableSlotIds,
  currentValues,
  editorReducer,
  isSlotEditable,
  type EditorState,
} from './state';

/**
 * The editor's rules, as data (P1-US-303).
 *
 * All of this is a pure reducer so the parts that matter — what may be edited,
 * what undo restores, and whether the year may still change — are testable without
 * a canvas.
 */
const slotSchema = {
  slots: [
    { id: 'photo-1', type: 'image' as const, required: true },
    { id: 'caption-1', type: 'text' as const, required: false, maxLength: 28 },
    { id: 'accent', type: 'color' as const, required: false },
  ],
};

const design = {
  schemaVersion: 1,
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
      objects: [
        { type: 'calendarGrid', id: 'grid-1', month: 1, year: 2027, locale: 'id-ID' },
        { type: 'text', id: 'locked-credit', text: 'BuildCalendar', locked: true },
      ],
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
        {
          id: 'caption-1',
          type: 'text',
          required: false,
          xMm: 10,
          yMm: 260,
          widthMm: 100,
          heightMm: 10,
        },
        { id: 'accent', type: 'color', required: false, xMm: 0, yMm: 0, widthMm: 0, heightMm: 0 },
      ],
    },
    {
      id: 'sheet-02',
      index: 1,
      widthMm: 297,
      heightMm: 420,
      bleedMm: 3,
      safeMarginMm: 10,
      objects: [{ type: 'calendarGrid', id: 'grid-2', month: 2, year: 2027, locale: 'id-ID' }],
      slots: [
        {
          id: 'photo-2',
          type: 'image',
          required: true,
          xMm: 0,
          yMm: 0,
          widthMm: 303,
          heightMm: 249,
        },
        {
          id: 'caption-1',
          type: 'text',
          required: false,
          xMm: 10,
          yMm: 260,
          widthMm: 100,
          heightMm: 10,
        },
        { id: 'accent', type: 'color', required: false, xMm: 0, yMm: 0, widthMm: 0, heightMm: 0 },
      ],
    },
  ],
};

const start = (): EditorState =>
  createEditorState({
    title: 'Kayu 2027',
    year: 2027,
    status: 'draft',
    design: structuredClone(design) as never,
    slotSchema,
  });

describe('isSlotEditable', () => {
  it('accepts an id listed in slot_schema', () => {
    expect(isSlotEditable('photo-1', slotSchema)).toBe(true);
    expect(isSlotEditable('caption-1', slotSchema)).toBe(true);
  });

  it('refuses anything the template did not open up', () => {
    // "Only objects listed in slot_schema are editable. Everything else is locked
    // and not selectable." A template author decides what a user may touch.
    expect(isSlotEditable('locked-credit', slotSchema)).toBe(false);
    expect(isSlotEditable('grid-1', slotSchema)).toBe(false);
    expect(isSlotEditable('', slotSchema)).toBe(false);
    expect(isSlotEditable('photo-1 ', slotSchema)).toBe(false);
  });

  it('lists exactly the editable ids', () => {
    expect(editableSlotIds(slotSchema)).toEqual(['photo-1', 'caption-1', 'accent']);
  });
});

describe('setSlotValue', () => {
  it('writes a text value onto the current sheet', () => {
    const next = editorReducer(start(), {
      type: 'setSlotValue',
      slotId: 'caption-1',
      value: { text: 'Keluarga Wijaya' },
    });

    expect(currentValues(next)['caption-1']).toEqual({ text: 'Keluarga Wijaya' });
    expect(next.isDirty).toBe(true);
  });

  it('refuses a slot that is not in the schema, and does not mark the project dirty', () => {
    const next = editorReducer(start(), {
      type: 'setSlotValue',
      slotId: 'locked-credit',
      value: { text: 'hacked' },
    });

    expect(currentValues(next)['locked-credit']).toBeUndefined();
    expect(next.isDirty).toBe(false);
  });

  it('truncates text to the slot maxLength rather than storing something that will not print', () => {
    const next = editorReducer(start(), {
      type: 'setSlotValue',
      slotId: 'caption-1',
      value: { text: 'x'.repeat(40) },
    });

    expect((currentValues(next)['caption-1'] as { text: string }).text).toHaveLength(28);
  });
});

describe('clearSlotValue', () => {
  it('empties a filled slot, which is what happens when its photo is deleted', () => {
    const filled = editorReducer(start(), {
      type: 'setSlotValue',
      slotId: 'photo-1',
      value: { assetId: 'asset-1' },
    });

    const next = editorReducer(filled, { type: 'clearSlotValue', slotId: 'photo-1' });

    expect(currentValues(next)['photo-1']).toBeUndefined();
    expect(next.isDirty).toBe(true);
  });

  it('leaves an already-empty slot alone rather than recording an undo step', () => {
    const before = start();
    const next = editorReducer(before, { type: 'clearSlotValue', slotId: 'photo-1' });

    expect(next).toBe(before);
  });

  it('refuses a slot the template locked', () => {
    const before = start();
    const next = editorReducer(before, { type: 'clearSlotValue', slotId: 'locked-credit' });

    expect(next).toBe(before);
  });

  it('only clears the current sheet', () => {
    let state = editorReducer(start(), { type: 'selectSheet', index: 1 });
    state = editorReducer(state, {
      type: 'setSlotValue',
      slotId: 'photo-1',
      value: { assetId: 'asset-1' },
    });
    state = editorReducer(state, { type: 'selectSheet', index: 0 });
    state = editorReducer(state, {
      type: 'setSlotValue',
      slotId: 'photo-1',
      value: { assetId: 'asset-1' },
    });
    state = editorReducer(state, { type: 'clearSlotValue', slotId: 'photo-1' });

    expect(state.perSheetValues[0]?.['photo-1']).toBeUndefined();
    expect(state.perSheetValues[1]?.['photo-1']).toEqual({ assetId: 'asset-1' });
  });
});

describe('setWeekStart', () => {
  const allowing = (): EditorState => ({
    ...start(),
    slotSchema: { ...slotSchema, allowWeekStart: true },
  });

  const weekStarts = (state: EditorState) =>
    state.design.sheets.flatMap((sheet) =>
      sheet.objects.filter((o) => o.type === 'calendarGrid').map((o) => o.weekStart),
    );

  it('switches every sheet, not only the one on screen', () => {
    const next = editorReducer(allowing(), { type: 'setWeekStart', weekStart: 'sunday' });

    // One month starting on a different day than the rest is a defect.
    expect(new Set(weekStarts(next))).toEqual(new Set(['sunday']));
    expect(next.isDirty).toBe(true);
  });

  it('refuses when the template does not allow it', () => {
    const before = start();
    const next = editorReducer(before, { type: 'setWeekStart', weekStart: 'sunday' });

    expect(next).toBe(before);
  });

  it('is undoable like any other edit', () => {
    const before = allowing();
    const changed = editorReducer(before, { type: 'setWeekStart', weekStart: 'sunday' });
    const undone = editorReducer(changed, { type: 'undo' });

    expect(weekStarts(undone)).toEqual(weekStarts(before));
    expect(weekStarts(changed)).not.toEqual(weekStarts(before));
  });
});

describe('applyToAll', () => {
  it('copies a colour to every sheet that has the slot', () => {
    let state = editorReducer(start(), {
      type: 'setSlotValue',
      slotId: 'accent',
      value: { color: '#1F4E79' },
    });
    state = editorReducer(state, { type: 'applyToAll', slotId: 'accent' });

    expect(state.perSheetValues[0]?.['accent']).toEqual({ color: '#1F4E79' });
    expect(state.perSheetValues[1]?.['accent']).toEqual({ color: '#1F4E79' });
  });

  it('copies a repeated text slot to the sheets that share its id', () => {
    let state = editorReducer(start(), {
      type: 'setSlotValue',
      slotId: 'caption-1',
      value: { text: 'Keluarga' },
    });
    state = editorReducer(state, { type: 'applyToAll', slotId: 'caption-1' });

    expect(state.perSheetValues[1]?.['caption-1']).toEqual({ text: 'Keluarga' });
  });

  it('does nothing for a slot the schema does not list', () => {
    const state = editorReducer(start(), { type: 'applyToAll', slotId: 'locked-credit' });
    expect(state.isDirty).toBe(false);
  });
});

describe('resetSheet', () => {
  it('drops every edit on the current sheet and leaves the others alone', () => {
    let state = editorReducer(start(), {
      type: 'setSlotValue',
      slotId: 'caption-1',
      value: { text: 'one' },
    });
    state = editorReducer(state, { type: 'selectSheet', index: 1 });
    state = editorReducer(state, {
      type: 'setSlotValue',
      slotId: 'caption-1',
      value: { text: 'two' },
    });

    state = editorReducer(state, { type: 'resetSheet' });

    expect(state.perSheetValues[1]).toEqual({});
    expect(state.perSheetValues[0]?.['caption-1']).toEqual({ text: 'one' });
  });
});

describe('undo and redo', () => {
  it('restores the previous value', () => {
    let state = editorReducer(start(), {
      type: 'setSlotValue',
      slotId: 'caption-1',
      value: { text: 'first' },
    });
    state = editorReducer(state, {
      type: 'setSlotValue',
      slotId: 'caption-1',
      value: { text: 'second' },
    });

    state = editorReducer(state, { type: 'undo' });
    expect((currentValues(state)['caption-1'] as { text: string }).text).toBe('first');

    state = editorReducer(state, { type: 'redo' });
    expect((currentValues(state)['caption-1'] as { text: string }).text).toBe('second');
  });

  it('keeps at least 20 steps, as the story requires', () => {
    expect(HISTORY_LIMIT).toBeGreaterThanOrEqual(20);

    let state = start();
    for (let step = 1; step <= HISTORY_LIMIT; step++) {
      state = editorReducer(state, {
        type: 'setSlotValue',
        slotId: 'caption-1',
        value: { text: `step-${step}` },
      });
    }

    for (let step = 0; step < HISTORY_LIMIT - 1; step++) {
      state = editorReducer(state, { type: 'undo' });
    }

    expect((currentValues(state)['caption-1'] as { text: string }).text).toBe('step-1');
  });

  it('does nothing at the ends rather than throwing', () => {
    const fresh = start();
    expect(currentValues(editorReducer(fresh, { type: 'undo' }))).toEqual(currentValues(fresh));
    expect(currentValues(editorReducer(fresh, { type: 'redo' }))).toEqual(currentValues(fresh));
  });

  it('discards the redo branch once a new edit is made', () => {
    let state = editorReducer(start(), {
      type: 'setSlotValue',
      slotId: 'caption-1',
      value: { text: 'a' },
    });
    state = editorReducer(state, { type: 'undo' });
    state = editorReducer(state, {
      type: 'setSlotValue',
      slotId: 'caption-1',
      value: { text: 'b' },
    });
    state = editorReducer(state, { type: 'redo' });

    expect((currentValues(state)['caption-1'] as { text: string }).text).toBe('b');
  });

  it('does not record selecting a sheet — that is navigation, not an edit', () => {
    let state = editorReducer(start(), {
      type: 'setSlotValue',
      slotId: 'caption-1',
      value: { text: 'kept' },
    });
    state = editorReducer(state, { type: 'selectSheet', index: 1 });
    state = editorReducer(state, { type: 'undo' });

    expect(state.perSheetValues[0]?.['caption-1']).toBeUndefined();
  });
});

describe('BR-U05 — the year is fixed once a project is unlocked', () => {
  it('allows a change while the project is a draft', () => {
    expect(canChangeYear('draft')).toBe(true);
  });

  it('refuses once unlocked, because one coin must not cover next year too', () => {
    expect(canChangeYear('unlocked')).toBe(false);
  });

  it('refuses while unlocking, when the coin is already committed', () => {
    expect(canChangeYear('unlocking')).toBe(false);
  });

  it('the reducer refuses the change too, not just the button', () => {
    const unlocked = createEditorState({
      title: 'Kayu 2027',
      year: 2027,
      status: 'unlocked',
      design: structuredClone(design) as never,
      slotSchema,
    });

    const next = editorReducer(unlocked, { type: 'setYear', year: 2028 });

    expect(next.year).toBe(2027);
    expect(next.isDirty).toBe(false);
  });

  it('retargets every calendar grid when the year does change', () => {
    const next = editorReducer(start(), { type: 'setYear', year: 2028 });

    expect(next.year).toBe(2028);
    expect(next.design.year).toBe(2028);
    expect((next.design.sheets[0]!.objects[0] as { year: number }).year).toBe(2028);
    expect((next.design.sheets[0]!.objects[0] as { month: number }).month).toBe(1);
  });
});

describe('title', () => {
  it('is editable and marks the project dirty', () => {
    const next = editorReducer(start(), { type: 'setTitle', title: 'Keluarga 2027' });
    expect(next.title).toBe('Keluarga 2027');
    expect(next.isDirty).toBe(true);
  });

  it('refuses an empty title rather than saving a nameless project', () => {
    const next = editorReducer(start(), { type: 'setTitle', title: '   ' });
    expect(next.title).toBe('Kayu 2027');
  });
});

describe('markSaved', () => {
  it('clears the dirty flag so the indicator can say Saved', () => {
    let state = editorReducer(start(), { type: 'setTitle', title: 'Keluarga 2027' });
    expect(state.isDirty).toBe(true);

    state = editorReducer(state, { type: 'markSaved' });
    expect(state.isDirty).toBe(false);
  });
});
