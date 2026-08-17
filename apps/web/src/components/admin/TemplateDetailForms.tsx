'use client';

import { useActionState } from 'react';
import {
  deleteTemplateAction,
  setTemplateActiveAction,
  updateTemplateAction,
  type TemplateActionState,
} from '@/lib/admin/template-actions';
import { en } from '@/lib/i18n/en';
import { FieldError, FormFeedback } from '@/components/auth/FormFeedback';
import { SubmitButton } from '@/components/auth/SubmitButton';

const EMPTY: TemplateActionState = {};

interface Props {
  slug: string;
  name: string;
  category: string;
  sortOrder: number;
  isPremium: boolean;
  isActive: boolean;
}

export function TemplateDetailForms({
  slug,
  name,
  category,
  sortOrder,
  isPremium,
  isActive,
}: Props) {
  const [editState, editAction] = useActionState(updateTemplateAction, EMPTY);
  const [activeState, activeAction] = useActionState(setTemplateActiveAction, EMPTY);
  const [deleteState, deleteAction] = useActionState(deleteTemplateAction, EMPTY);

  return (
    <>
      <form className="admin-form admin-aside-form" action={editAction}>
        <FormFeedback state={editState} />
        <input type="hidden" name="slug" value={slug} />

        <div className="field">
          <label htmlFor="edit-name">{en.admin.templates.fieldName}</label>
          <input className="input" id="edit-name" name="name" defaultValue={name} required />
          <FieldError message={editState.fieldErrors?.['name']} />
        </div>

        <div className="field">
          <label htmlFor="edit-category">{en.admin.templates.fieldCategory}</label>
          <input
            className="input"
            id="edit-category"
            name="category"
            defaultValue={category}
            required
          />
          <FieldError message={editState.fieldErrors?.['category']} />
        </div>

        <div className="field">
          <label htmlFor="edit-order">{en.admin.templates.fieldSortOrder}</label>
          <input
            className="input"
            id="edit-order"
            name="sortOrder"
            type="number"
            defaultValue={sortOrder}
          />
        </div>

        <label className="check">
          <input type="checkbox" name="isPremium" defaultChecked={isPremium} />
          {en.admin.templates.fieldPremium}
        </label>

        <SubmitButton
          label={en.admin.templates.saveChanges}
          pendingLabel={en.admin.templates.submitting}
        />
      </form>

      <form className="admin-form admin-aside-form" action={activeAction}>
        <FormFeedback state={activeState} />
        <input type="hidden" name="slug" value={slug} />
        <input type="hidden" name="isActive" value={String(!isActive)} />
        <p className="small muted">{en.admin.templates.activateHint}</p>
        <SubmitButton
          label={isActive ? en.admin.templates.deactivate : en.admin.templates.activate}
          pendingLabel={en.admin.templates.submitting}
        />
      </form>

      <form className="admin-form admin-aside-form" action={deleteAction}>
        <FormFeedback state={deleteState} />
        <input type="hidden" name="slug" value={slug} />
        <p className="small muted">{en.admin.templates.deleteHint}</p>

        <div className="field">
          <label htmlFor="delete-slug">{en.admin.templates.deleteConfirmLabel}</label>
          <input
            className="input"
            id="delete-slug"
            name="confirmSlug"
            placeholder={slug}
            required
          />
          <FieldError message={deleteState.fieldErrors?.['confirmSlug']} />
        </div>

        <SubmitButton
          label={en.admin.templates.delete}
          pendingLabel={en.admin.templates.submitting}
        />
      </form>
    </>
  );
}
