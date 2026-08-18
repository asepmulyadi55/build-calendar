'use client';

import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import Link from 'next/link';
import { MONTHS_ID_SHORT, hasHolidayData, type Holiday } from '@buildcalendar/calendar-core';
import { saveProjectAction } from '@/lib/editor/actions';
import {
  canChangeYear,
  createEditorState,
  currentValues,
  editableSlotIds,
  editorReducer,
  type SlotSchema,
} from '@/lib/editor/state';
import { en, fill } from '@/lib/i18n/en';
import { routes } from '@/lib/routes';
import { SheetCanvas } from './SheetCanvas';
import { PropertiesPanel } from './PropertiesPanel';

/** P1-US-303: autosave debounced at 5 seconds. */
const AUTOSAVE_DELAY_MS = 5000;

type SaveState = 'idle' | 'dirty' | 'saving' | 'saved' | 'failed';

export function Editor({
  projectId,
  title,
  year,
  status,
  design,
  slotSchema,
  holidays,
  holidayDataUpdatedAt,
  years,
}: {
  projectId: string;
  title: string;
  year: number;
  status: 'draft' | 'unlocking' | 'unlocked';
  design: never;
  slotSchema: SlotSchema;
  holidays: Holiday[];
  holidayDataUpdatedAt: string | null;
  years: number[];
}) {
  const [state, dispatch] = useReducer(
    editorReducer,
    { title, year, status, design, slotSchema },
    createEditorState,
  );
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const editable = editableSlotIds(state.slotSchema);
  const sheet = state.design.sheets[state.sheetIndex]!;

  const save = useCallback(async () => {
    setSaveState('saving');
    const result = await saveProjectAction({
      projectId,
      title: state.title,
      year: state.year,
      perSheetValues: state.perSheetValues,
    });

    if (result.ok) {
      dispatch({ type: 'markSaved' });
      setSaveState('saved');
    } else {
      // Never discard the user's work on a failed save; the next debounce retries.
      setSaveState('failed');
    }
  }, [projectId, state.title, state.year, state.perSheetValues]);

  // Debounced autosave. Every edit restarts the clock, so a burst of typing is
  // one write rather than one per keystroke — which matters on a 1 GB box.
  useEffect(() => {
    if (!state.isDirty) return undefined;

    setSaveState('dirty');
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void save(), AUTOSAVE_DELAY_MS);

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [state.isDirty, state.perSheetValues, state.title, state.year, save]);

  // Undo/redo, at least 20 steps.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const modifier = event.metaKey || event.ctrlKey;
      if (!modifier || event.key.toLowerCase() !== 'z') return;

      // Let the browser handle undo inside a text field.
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;

      event.preventDefault();
      dispatch({ type: event.shiftKey ? 'redo' : 'undo' });
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  const saveLabel =
    saveState === 'saving'
      ? en.editor.saving
      : saveState === 'saved'
        ? en.editor.saved
        : saveState === 'failed'
          ? en.editor.saveFailed
          : saveState === 'dirty'
            ? en.editor.unsaved
            : en.editor.saved;

  return (
    <>
      <nav className="nav editor-nav">
        <div className="wrap nav-in">
          <Link className="brand" href={routes.home}>
            {en.app.nameLead}
            <span>{en.app.nameTail}</span>
          </Link>

          <div className="row ed-title-row">
            <input
              className="input project-title"
              value={state.title}
              aria-label={en.editor.titleLabel}
              onChange={(event) => dispatch({ type: 'setTitle', title: event.target.value })}
            />
            <span className="save-state" role="status">
              {saveLabel}
            </span>
          </div>

          <div className="nav-cta ed-nav-cta">
            <Link href={routes.newProject} className="btn btn-ghost btn-sm">
              {en.editor.close}
            </Link>
          </div>
        </div>
      </nav>

      {/* Below 1024px the editor is not attempted; the notice from the prototype
          is shown instead and everything else on the site still works. */}
      <div className="editor-notice">
        <span className="eyebrow">{en.editor.smallScreenEyebrow}</span>
        <h2>{en.editor.smallScreenTitle}</h2>
        <p>{en.editor.smallScreenBody}</p>
        <div className="row">
          <Link href={routes.newProject} className="btn btn-ghost">
            {en.editor.smallScreenBack}
          </Link>
        </div>
      </div>

      <div className="editor">
        <div className="ed-sheets">
          {state.design.sheets.map((item, index) => {
            const grid = item.objects.find((object) => object.type === 'calendarGrid');
            const month = grid?.type === 'calendarGrid' ? grid.month : index + 1;

            return (
              <button
                type="button"
                key={item.id}
                className={index === state.sheetIndex ? 'ed-thumb on' : 'ed-thumb'}
                onClick={() => {
                  dispatch({ type: 'selectSheet', index });
                  setSelectedSlotId(null);
                }}
              >
                <div className="t" />
                {/* The thumbnail label is printed output: Indonesian. */}
                <div className="l">{MONTHS_ID_SHORT[month - 1]?.toUpperCase()}</div>
              </button>
            );
          })}
        </div>

        <div className="ed-canvas">
          {/* P1-US-305: never render an empty holiday set silently. A calendar with
              no red dates looks finished, and the user only finds out in print. */}
          {!hasHolidayData(state.year, holidays) ? (
            <div className="card ed-holiday-warn" role="alert">
              <b>{fill(en.editor.holidayDataMissingTitle, { year: String(state.year) })}</b>
              <p className="small">{en.editor.holidayDataMissingBody}</p>
            </div>
          ) : (
            holidayDataUpdatedAt && (
              <p className="small muted ed-holiday-date">
                {fill(en.editor.holidayDataUpdated, {
                  // id-ID formatting, even though the copy is English (master §10.7).
                  date: new Intl.DateTimeFormat('id-ID', { dateStyle: 'long' }).format(
                    new Date(holidayDataUpdatedAt),
                  ),
                })}
              </p>
            )
          )}

          <SheetCanvas
            sheet={sheet}
            year={state.year}
            values={currentValues(state)}
            editableSlotIds={editable}
            selectedSlotId={selectedSlotId}
            onSelectSlot={setSelectedSlotId}
            holidays={holidays}
            sheetCount={state.design.sheets.length}
          />
        </div>

        <PropertiesPanel
          state={state}
          dispatch={dispatch}
          selectedSlotId={selectedSlotId}
          years={years}
          canChangeYear={canChangeYear(state.status)}
          sheetLabel={fill(en.editor.panelSheet, { index: state.sheetIndex + 1 })}
          projectId={projectId}
        />
      </div>
    </>
  );
}
