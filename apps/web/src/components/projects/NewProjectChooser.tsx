'use client';

import { useActionState, useMemo, useState } from 'react';
import { Badge, Modal } from '@buildcalendar/ui';
import type { CalendarDesign } from '@buildcalendar/calendar-core';
import { createProjectFromTemplateAction, type CreateProjectState } from '@/lib/projects/actions';
import { en, fill } from '@/lib/i18n/en';
import { SheetSchematic } from '@/components/admin/SheetSchematic';
import { FormFeedback } from '@/components/auth/FormFeedback';
import { SubmitButton } from '@/components/auth/SubmitButton';

export interface PresetOption {
  id: string;
  code: string;
  name: string;
  description: string | null;
  paperName: string | null;
  widthMm: number;
  heightMm: number;
  sheetCount: number;
}

export interface TemplateOption {
  slug: string;
  name: string;
  category: string;
  swatch: string;
  isPremium: boolean;
  productPresetId: string;
  slotCount: number;
  /** Read server-side from R2 so the quick look can show every sheet. */
  design: CalendarDesign | null;
}

const EMPTY: CreateProjectState = {};

/**
 * Choose a format, then a design (P1-US-301, P1-US-302).
 *
 * Both steps are on one page, matching `design/app-new.html`: picking a format
 * filters the gallery below rather than navigating, so comparing formats costs
 * nothing.
 */
export function NewProjectChooser({
  presets,
  templates,
  years,
  initialTemplateSlug,
}: {
  presets: PresetOption[];
  templates: TemplateOption[];
  years: number[];
  initialTemplateSlug: string | null;
}) {
  // A guest who signed in mid-flow comes back with ?template=…; preselect that
  // template's format so they land on the same choice.
  const returning = templates.find((template) => template.slug === initialTemplateSlug) ?? null;

  const [presetId, setPresetId] = useState<string | null>(returning?.productPresetId ?? null);
  const [category, setCategory] = useState<string | null>(null);
  const [year, setYear] = useState(years[0] ?? new Date().getFullYear() + 1);
  const [openSlug, setOpenSlug] = useState<string | null>(returning?.slug ?? null);
  const [state, action] = useActionState(createProjectFromTemplateAction, EMPTY);

  const forPreset = useMemo(
    () => (presetId ? templates.filter((template) => template.productPresetId === presetId) : []),
    [templates, presetId],
  );

  const categories = useMemo(
    () => [...new Set(forPreset.map((template) => template.category))].sort(),
    [forPreset],
  );

  const visible = useMemo(
    () => (category ? forPreset.filter((template) => template.category === category) : forPreset),
    [forPreset, category],
  );

  const open = templates.find((template) => template.slug === openSlug) ?? null;

  return (
    <>
      <FormFeedback state={state} />

      {presets.length === 0 ? (
        <p className="lede">{en.newProject.noPresets}</p>
      ) : (
        <div className="types new-types">
          {presets.map((preset, index) => {
            const isSelected = preset.id === presetId;
            const size = `${preset.widthMm} × ${preset.heightMm} mm`;

            return (
              <button
                type="button"
                key={preset.id}
                className={isSelected ? 'type type-selected' : 'type'}
                aria-pressed={isSelected}
                onClick={() => {
                  setPresetId(preset.id);
                  setCategory(null);
                }}
              >
                <div className="mini">
                  <i style={miniShape(preset)} />
                </div>
                <div className="idx">
                  {String(index + 1).padStart(2, '0')}
                  {isSelected ? ` · ${en.newProject.selected}` : ''}
                </div>
                <h3>{preset.name}</h3>
                {preset.description && <p>{preset.description}</p>}
                <div className="dims">
                  <b>{preset.paperName ? `${preset.paperName} · ${size}` : size}</b>
                  {` · ${preset.sheetCount} ${
                    preset.sheetCount === 1
                      ? en.newProject.sheetSuffixSingular
                      : en.newProject.sheetsSuffix
                  }`}
                </div>
              </button>
            );
          })}
        </div>
      )}

      <div id="designs" className="row-between new-designs-head">
        <div>
          <div className="crumb">{en.newProject.crumbStep2}</div>
          <h2 className="h3 new-designs-title">{en.newProject.titleDesign}</h2>
        </div>

        <div className="row">
          <label className="small muted" htmlFor="new-year">
            {en.newProject.year}
          </label>
          <select
            className="input new-year"
            id="new-year"
            value={year}
            onChange={(event) => setYear(Number(event.target.value))}
          >
            {years.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>

          {/* Phase 3. Disabled and labelled, never a dead link. */}
          <button
            type="button"
            className="btn btn-ghost btn-sm is-disabled"
            disabled
            aria-disabled="true"
            title={en.newProject.fromScratchHint}
          >
            {en.newProject.fromScratch} — {en.newProject.fromScratchBadge}
          </button>
        </div>
      </div>

      {presetId === null ? (
        <p className="lede">{en.newProject.chooseFormatFirst}</p>
      ) : (
        <>
          {categories.length > 0 && (
            <div className="chips new-chips" role="group" aria-label={en.newProject.filterLabel}>
              <button
                type="button"
                className={category === null ? 'chip on' : 'chip'}
                aria-pressed={category === null}
                onClick={() => setCategory(null)}
              >
                {en.newProject.filterAll}
              </button>
              {categories.map((name) => (
                <button
                  key={name}
                  type="button"
                  className={category === name ? 'chip on' : 'chip'}
                  aria-pressed={category === name}
                  onClick={() => setCategory(name)}
                >
                  {name}
                </button>
              ))}
            </div>
          )}

          {visible.length === 0 ? (
            <div className="card">
              <p className="muted">{en.newProject.noTemplates}</p>
            </div>
          ) : (
            <div className="grid-4">
              {visible.map((template) => (
                <button
                  type="button"
                  className="samp samp-button"
                  key={template.slug}
                  onClick={() => setOpenSlug(template.slug)}
                >
                  <div className={`img ${template.swatch}`} />
                  <div className="cap">
                    <b>{template.name}</b>
                    {template.isPremium ? (
                      <Badge tone="red">{en.newProject.premium}</Badge>
                    ) : (
                      <span className="mono">{en.newProject.use}</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      <Modal
        open={open !== null}
        onClose={() => setOpenSlug(null)}
        label={open?.name ?? ''}
        closeLabel={en.newProject.modal.close}
      >
        {open && (
          <>
            <b className="h3">{open.name}</b>
            <p className="muted small new-modal-lede">
              {open.slotCount === 1
                ? en.newProject.modal.slot
                : fill(en.newProject.modal.slots, { count: open.slotCount })}
            </p>

            {/* Every sheet in the design, drawn to scale. The real render arrives
                with the renderer; there is only ever one render engine (AR-01). */}
            {open.design && (
              <div className="admin-sheets new-modal-sheets">
                {open.design.sheets.map((sheet, index) => (
                  <div className="admin-sheet" key={sheet.id}>
                    <SheetSchematic sheet={sheet} />
                    <div className="l">
                      {fill(en.newProject.modal.sheetLabel, { index: index + 1 })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <form action={action} className="new-modal-form">
              <input type="hidden" name="slug" value={open.slug} />
              <input type="hidden" name="year" value={year} />
              <SubmitButton
                label={en.newProject.modal.useThis}
                pendingLabel={en.newProject.creating}
              />
            </form>
          </>
        )}
      </Modal>
    </>
  );
}

/** The proportional rectangle above each card, at the real trim ratio. */
function miniShape(preset: PresetOption): { width: string; height: string } {
  const MAX_EDGE_PX = 76;
  const scale = MAX_EDGE_PX / Math.max(preset.widthMm, preset.heightMm);

  return {
    width: `${Math.round(preset.widthMm * scale)}px`,
    height: `${Math.round(preset.heightMm * scale)}px`,
  };
}
