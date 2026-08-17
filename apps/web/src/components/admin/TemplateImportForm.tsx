'use client';

import { useActionState } from 'react';
import { importTemplateAction, type TemplateActionState } from '@/lib/admin/template-actions';
import { en } from '@/lib/i18n/en';
import { FieldError, FormFeedback } from '@/components/auth/FormFeedback';
import { SubmitButton } from '@/components/auth/SubmitButton';
import { ValidationIssues } from './ValidationIssues';

const EMPTY: TemplateActionState = {};

interface PresetOption {
  id: string;
  code: string;
  name: string;
  sheetCount: number;
}

export function TemplateImportForm({ presets }: { presets: PresetOption[] }) {
  const [state, action] = useActionState(importTemplateAction, EMPTY);

  return (
    <form className="admin-form" action={action}>
      <FormFeedback state={state} />
      <ValidationIssues issues={state.issues} />

      <div className="admin-cols">
        <div className="field">
          <label htmlFor="tpl-name">{en.admin.templates.fieldName}</label>
          <input className="input" id="tpl-name" name="name" required />
          <FieldError message={state.fieldErrors?.['name']} />
        </div>

        <div className="field">
          <label htmlFor="tpl-slug">{en.admin.templates.fieldSlug}</label>
          <input className="input" id="tpl-slug" name="slug" required />
          <span className="hint">{en.admin.templates.fieldSlugHint}</span>
          <FieldError message={state.fieldErrors?.['slug']} />
        </div>
      </div>

      <div className="admin-cols">
        <div className="field">
          <label htmlFor="tpl-preset">{en.admin.templates.fieldPreset}</label>
          <select className="input" id="tpl-preset" name="productPresetId" required defaultValue="">
            <option value="" disabled />
            {presets.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.name} · {preset.code} · {preset.sheetCount}
              </option>
            ))}
          </select>
          <FieldError message={state.fieldErrors?.['productPresetId']} />
        </div>

        <div className="field">
          <label htmlFor="tpl-category">{en.admin.templates.fieldCategory}</label>
          <input className="input" id="tpl-category" name="category" required />
          <FieldError message={state.fieldErrors?.['category']} />
        </div>
      </div>

      <div className="admin-cols">
        <div className="field">
          <label htmlFor="tpl-order">{en.admin.templates.fieldSortOrder}</label>
          <input className="input" id="tpl-order" name="sortOrder" type="number" defaultValue={0} />
        </div>

        <div className="field">
          <label htmlFor="tpl-thumb">{en.admin.templates.fieldThumbnail}</label>
          <input className="input" id="tpl-thumb" name="thumbnail" type="file" accept="image/*" />
          <span className="hint">{en.admin.templates.fieldThumbnailHint}</span>
          <FieldError message={state.fieldErrors?.['thumbnail']} />
        </div>
      </div>

      <label className="check">
        <input type="checkbox" name="isPremium" />
        {en.admin.templates.fieldPremium}
      </label>

      <div className="field">
        <label htmlFor="tpl-file">{en.admin.templates.fieldDesignFile}</label>
        <input
          className="input"
          id="tpl-file"
          name="designFile"
          type="file"
          accept="application/json,.json"
        />
      </div>

      <div className="field">
        <label htmlFor="tpl-json">{en.admin.templates.fieldDesignPaste}</label>
        <textarea className="input" id="tpl-json" name="designJson" rows={10} />
        <FieldError message={state.fieldErrors?.['designJson']} />
      </div>

      <SubmitButton
        label={en.admin.templates.submitImport}
        pendingLabel={en.admin.templates.submitting}
      />
    </form>
  );
}
