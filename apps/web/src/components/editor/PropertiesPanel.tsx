'use client';

import type { Dispatch } from 'react';
import { MONTHS_ID, type Sheet } from '@buildcalendar/calendar-core';
import {
  currentValues,
  type EditorAction,
  type EditorState,
  type SlotSchemaEntry,
} from '@/lib/editor/state';
import { en, fill } from '@/lib/i18n/en';
import { PhotoPicker } from './PhotoPicker';

/**
 * The printed width of a slot, which is what decides whether a photo has enough
 * pixels (VLD-RES). Millimetres, like every other coordinate in a design.
 */
function slotWidthMm(sheet: Sheet, slotId: string): number {
  const object = sheet.objects.find(
    (candidate) => candidate.type === 'imageSlot' && candidate.slotId === slotId,
  );
  return object?.type === 'imageSlot' ? object.widthMm : 1;
}

/** The template palette. Colours come from the design system, not invented here. */
const PALETTE = ['var(--merah)', 'var(--ok)', 'var(--warn)', 'var(--ink)', 'var(--ink-45)'];

/**
 * The right-hand properties panel (P1-US-303).
 *
 * It only ever offers controls for slots the template opened up. Anything else —
 * layout, grid position, typography — is stated as locked rather than silently
 * absent, so a user knows the design is deliberate rather than the editor broken.
 */
export function PropertiesPanel({
  state,
  dispatch,
  selectedSlotId,
  years,
  canChangeYear,
  sheetLabel,
  projectId,
}: {
  state: EditorState;
  dispatch: Dispatch<EditorAction>;
  selectedSlotId: string | null;
  years: number[];
  canChangeYear: boolean;
  sheetLabel: string;
  projectId: string;
}) {
  const values = currentValues(state);
  const sheet = state.design.sheets[state.sheetIndex]!;
  const grid = sheet.objects.find((object) => object.type === 'calendarGrid');
  const month = grid?.type === 'calendarGrid' ? grid.month : 1;
  const weekStart = grid?.type === 'calendarGrid' ? grid.weekStart : 'monday';

  const entry: SlotSchemaEntry | undefined = selectedSlotId
    ? state.slotSchema.slots.find((slot) => slot.id === selectedSlotId)
    : undefined;

  const selectedValue = selectedSlotId ? values[selectedSlotId] : undefined;
  const text = selectedValue && 'text' in selectedValue ? selectedValue.text : '';

  return (
    <aside className="ed-panel">
      <div className="panel-group">
        <h4>{sheetLabel}</h4>
        {!entry && <p className="small muted ed-empty">{en.editor.nothingSelected}</p>}
      </div>

      {entry?.type === 'image' && (
        <div className="panel-group">
          <h4>{en.editor.panelPhoto}</h4>
          <PhotoPicker
            slotWidthMm={slotWidthMm(sheet, entry.id)}
            value={selectedValue && 'assetId' in selectedValue ? selectedValue : undefined}
            projectId={projectId}
            onChange={(next) => {
              dispatch(
                next
                  ? { type: 'setSlotValue', slotId: entry.id, value: next }
                  : { type: 'clearSlotValue', slotId: entry.id },
              );
            }}
          />
        </div>
      )}

      {/* P1-US-305: the week may start on Sunday where the template allows it.
          Where it does not, the constraint is stated rather than hidden. */}
      <div className="panel-group">
        <h4>{en.editor.weekStart}</h4>
        {state.slotSchema.allowWeekStart ? (
          <div className="ed-toolbar" role="group" aria-label={en.editor.weekStart}>
            {(['monday', 'sunday'] as const).map((option) => (
              <button
                key={option}
                type="button"
                className={weekStart === option ? 'btn btn-primary' : 'btn'}
                aria-pressed={weekStart === option}
                onClick={() => {
                  dispatch({ type: 'setWeekStart', weekStart: option });
                }}
              >
                {option === 'monday' ? en.editor.weekStartMonday : en.editor.weekStartSunday}
              </button>
            ))}
          </div>
        ) : (
          <p className="small muted">{en.editor.weekStartLocked}</p>
        )}
      </div>

      {entry?.type === 'text' && (
        <div className="panel-group">
          <h4>{en.editor.panelCaption}</h4>
          <input
            className="input"
            value={text}
            maxLength={entry.maxLength ?? undefined}
            onChange={(event) =>
              dispatch({
                type: 'setSlotValue',
                slotId: entry.id,
                value: { text: event.target.value },
              })
            }
          />
          {typeof entry.maxLength === 'number' && (
            <span className="hint">
              {fill(en.editor.charactersUsed, { used: text.length, max: entry.maxLength })}
            </span>
          )}
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => dispatch({ type: 'applyToAll', slotId: entry.id })}
          >
            {en.editor.applyToAll}
          </button>
        </div>
      )}

      {entry?.type === 'color' && (
        <div className="panel-group">
          <h4>{en.editor.panelColour}</h4>
          <div className="swatches">
            {PALETTE.map((colour) => {
              const active =
                selectedValue && 'color' in selectedValue && selectedValue.color === colour;
              return (
                <button
                  type="button"
                  key={colour}
                  className={active ? 'sw on' : 'sw'}
                  style={{ background: colour }}
                  aria-label={colour}
                  onClick={() =>
                    dispatch({ type: 'setSlotValue', slotId: entry.id, value: { color: colour } })
                  }
                />
              );
            })}
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => dispatch({ type: 'applyToAll', slotId: entry.id })}
          >
            {en.editor.applyToAll}
          </button>
        </div>
      )}

      <div className="panel-group">
        <h4>{en.editor.panelMonth}</h4>
        {/* The control shows the printed value — Januari, not January — while its
            label stays English (master §10.7). Read-only in template mode: the
            month belongs to the sheet the designer laid out. */}
        <select className="input" value={month} disabled>
          {MONTHS_ID.map((name, index) => (
            <option key={name} value={index + 1}>
              {name}
            </option>
          ))}
        </select>
        <p className="small muted ed-empty">{en.editor.panelMonthHint}</p>
      </div>

      <div className="panel-group">
        <h4>{en.editor.year}</h4>
        <select
          className="input"
          value={state.year}
          disabled={!canChangeYear}
          onChange={(event) => dispatch({ type: 'setYear', year: Number(event.target.value) })}
        >
          {years.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        {/* BR-U05: one coin covers one calendar, so an unlocked project's year is
            fixed and the way forward is a duplicate. */}
        {!canChangeYear && (
          <>
            <p className="small muted ed-empty">{en.editor.yearLockedHint}</p>
            <button type="button" className="btn btn-ghost btn-sm" disabled>
              {en.editor.duplicate}
            </button>
          </>
        )}
      </div>

      <div className="panel-group">
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => dispatch({ type: 'resetSheet' })}
        >
          {en.editor.resetSheet}
        </button>
      </div>

      <div className="panel-group">
        <h4>{en.editor.panelLocked}</h4>
        <p className="small muted ed-empty">{en.editor.panelLockedHint}</p>
      </div>
    </aside>
  );
}
