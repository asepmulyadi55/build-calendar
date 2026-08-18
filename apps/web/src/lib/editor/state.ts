import type { CalendarDesign, WeekStart } from '@buildcalendar/calendar-core';

/**
 * The editor's state, as a pure reducer (P1-US-303).
 *
 * Everything that decides what a user may change lives here rather than in a
 * component, so the rules are testable without a canvas — and so the canvas cannot
 * quietly disagree with them.
 *
 * The rule the whole file turns on: **only slots listed in `slot_schema` are
 * editable.** Everything else is the template author's, and is neither selectable
 * nor writable. The check is repeated in the reducer rather than trusted to the
 * UI, because a disabled input is not a boundary.
 */

/** P1-US-303 asks for at least 20 undo steps. */
export const HISTORY_LIMIT = 30;

export type SlotType = 'image' | 'text' | 'color';

export interface SlotSchemaEntry {
  id: string;
  type: SlotType;
  required: boolean;
  maxLength?: number;
}

export interface SlotSchema {
  slots: SlotSchemaEntry[];
  /**
   * Whether the template lets the user switch the week to start on Sunday
   * (P1-US-305). Absent means no: a template's grid geometry is drawn for one
   * arrangement, and most are.
   */
  allowWeekStart?: boolean;
}

/** What a user has put in a slot. Images arrive with P1-US-304. */
export type SlotValue =
  | { text: string }
  | { color: string }
  | { assetId: string; panX?: number; panY?: number; zoom?: number; rotation?: number };

export type ProjectStatus = 'draft' | 'unlocking' | 'unlocked';

export interface EditorState {
  title: string;
  year: number;
  status: ProjectStatus;
  design: CalendarDesign;
  slotSchema: SlotSchema;
  sheetIndex: number;
  /** Slot values per sheet, indexed the same way as `design.sheets`. */
  perSheetValues: Record<string, SlotValue>[];
  isDirty: boolean;
  past: Snapshot[];
  future: Snapshot[];
}

interface Snapshot {
  title: string;
  year: number;
  design: CalendarDesign;
  perSheetValues: Record<string, SlotValue>[];
}

export type EditorAction =
  | { type: 'selectSheet'; index: number }
  | { type: 'setSlotValue'; slotId: string; value: SlotValue }
  | { type: 'clearSlotValue'; slotId: string }
  | { type: 'setWeekStart'; weekStart: WeekStart }
  | { type: 'applyToAll'; slotId: string }
  | { type: 'resetSheet' }
  | { type: 'setTitle'; title: string }
  | { type: 'setYear'; year: number }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'markSaved' };

export function createEditorState(input: {
  title: string;
  year: number;
  status: ProjectStatus;
  design: CalendarDesign;
  slotSchema: SlotSchema;
  perSheetValues?: Record<string, SlotValue>[];
}): EditorState {
  return {
    title: input.title,
    year: input.year,
    status: input.status,
    design: input.design,
    slotSchema: input.slotSchema,
    sheetIndex: 0,
    perSheetValues:
      input.perSheetValues ?? input.design.sheets.map(() => ({}) as Record<string, SlotValue>),
    isDirty: false,
    past: [],
    future: [],
  };
}

export function editableSlotIds(schema: SlotSchema): string[] {
  return schema.slots.map((slot) => slot.id);
}

/** Exact match. A trimmed or near-miss id is not the slot the template opened up. */
export function isSlotEditable(slotId: string, schema: SlotSchema): boolean {
  return schema.slots.some((slot) => slot.id === slotId);
}

function slotEntry(slotId: string, schema: SlotSchema): SlotSchemaEntry | undefined {
  return schema.slots.find((slot) => slot.id === slotId);
}

/**
 * BR-U05 — changing the year on an unlocked project is not permitted. One coin
 * must not cover next year's calendar too; the UI offers "Duplikat" instead.
 */
export function canChangeYear(status: ProjectStatus): boolean {
  return status === 'draft';
}

function snapshot(state: EditorState): Snapshot {
  return {
    title: state.title,
    year: state.year,
    design: state.design,
    perSheetValues: state.perSheetValues,
  };
}

/** Records an edit. Navigation never lands here — undo restores work, not scroll. */
function withHistory(state: EditorState, next: Partial<EditorState>): EditorState {
  return {
    ...state,
    ...next,
    isDirty: true,
    past: [...state.past, snapshot(state)].slice(-HISTORY_LIMIT),
    // A new edit ends the redo branch, the way every editor behaves.
    future: [],
  };
}

function retargetYear(design: CalendarDesign, year: number): CalendarDesign {
  const copy = structuredClone(design) as unknown as {
    year: number;
    sheets: { objects: Record<string, unknown>[] }[];
  };

  copy.year = year;
  for (const sheet of copy.sheets) {
    for (const object of sheet.objects) {
      if (object['type'] === 'calendarGrid') object['year'] = year;
    }
  }

  return copy as unknown as CalendarDesign;
}

export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case 'selectSheet': {
      const index = Math.max(0, Math.min(state.design.sheets.length - 1, action.index));
      return { ...state, sheetIndex: index };
    }

    case 'setSlotValue': {
      const entry = slotEntry(action.slotId, state.slotSchema);
      if (!entry) return state;

      let value = action.value;
      // A caption longer than the template allows would not print. Truncate rather
      // than store something the renderer will silently cut.
      if ('text' in value && typeof entry.maxLength === 'number') {
        value = { text: value.text.slice(0, entry.maxLength) };
      }

      const perSheetValues = state.perSheetValues.map((sheet, index) =>
        index === state.sheetIndex ? { ...sheet, [action.slotId]: value } : sheet,
      );

      return withHistory(state, { perSheetValues });
    }

    case 'clearSlotValue': {
      // Emptying a slot — the photo was removed from the gallery, or the user
      // changed their mind. The slot returns to whatever the template shows.
      if (!isSlotEditable(action.slotId, state.slotSchema)) return state;

      const current = state.perSheetValues[state.sheetIndex];
      if (!current || !(action.slotId in current)) return state;

      const perSheetValues = state.perSheetValues.map((sheetValues, index) => {
        if (index !== state.sheetIndex) return sheetValues;
        const { [action.slotId]: _removed, ...rest } = sheetValues;
        return rest;
      });

      return withHistory(state, { perSheetValues });
    }

    case 'setWeekStart': {
      // Only where the template allows it. A grid drawn for a Monday start does
      // not necessarily have room for a Sunday one (P1-US-305).
      if (!state.slotSchema.allowWeekStart) return state;
      if (action.weekStart !== 'monday' && action.weekStart !== 'sunday') return state;

      // Every sheet, not just the current one: a calendar with one month starting
      // on a different day is a defect, not a choice.
      const sheets = state.design.sheets.map((sheet) => ({
        ...sheet,
        objects: sheet.objects.map((object) =>
          object.type === 'calendarGrid' ? { ...object, weekStart: action.weekStart } : object,
        ),
      }));

      return withHistory(state, { design: { ...state.design, sheets } });
    }

    case 'applyToAll': {
      if (!isSlotEditable(action.slotId, state.slotSchema)) return state;

      const value = state.perSheetValues[state.sheetIndex]?.[action.slotId];
      if (!value) return state;

      const perSheetValues = state.perSheetValues.map((sheetValues, index) => {
        // Only sheets that actually have this slot; the schema is per design, but
        // an individual sheet may not carry every slot.
        const sheetHasSlot = state.design.sheets[index]?.slots.some(
          (slot) => slot.id === action.slotId,
        );
        return sheetHasSlot ? { ...sheetValues, [action.slotId]: value } : sheetValues;
      });

      return withHistory(state, { perSheetValues });
    }

    case 'resetSheet': {
      const perSheetValues = state.perSheetValues.map((sheetValues, index) =>
        index === state.sheetIndex ? {} : sheetValues,
      );
      return withHistory(state, { perSheetValues });
    }

    case 'setTitle': {
      const title = action.title.trim();
      if (title.length === 0) return state;
      return withHistory(state, { title });
    }

    case 'setYear': {
      // Enforced here, not only on the button. BR-U05.
      if (!canChangeYear(state.status)) return state;
      if (action.year === state.year) return state;

      return withHistory(state, {
        year: action.year,
        design: retargetYear(state.design, action.year),
      });
    }

    case 'undo': {
      const previous = state.past[state.past.length - 1];
      if (!previous) return state;

      return {
        ...state,
        ...previous,
        isDirty: true,
        past: state.past.slice(0, -1),
        future: [snapshot(state), ...state.future].slice(0, HISTORY_LIMIT),
      };
    }

    case 'redo': {
      const next = state.future[0];
      if (!next) return state;

      return {
        ...state,
        ...next,
        isDirty: true,
        past: [...state.past, snapshot(state)].slice(-HISTORY_LIMIT),
        future: state.future.slice(1),
      };
    }

    case 'markSaved':
      return { ...state, isDirty: false };

    default:
      return state;
  }
}

/** Convenience for the panel: the values for the sheet currently open. */
export function currentValues(state: EditorState): Record<string, SlotValue> {
  return state.perSheetValues[state.sheetIndex] ?? {};
}
