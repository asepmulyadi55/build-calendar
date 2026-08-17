'use client';

import { useActionState } from 'react';
import { updateProfileAction, type ActionState } from '@/lib/auth/actions';
import { en } from '@/lib/i18n/en';
import { FieldError, FormFeedback } from './FormFeedback';
import { SubmitButton } from './SubmitButton';

const EMPTY: ActionState = {};

export function ProfileForm({ name, phone }: { name: string; phone: string }) {
  const [state, action] = useActionState(updateProfileAction, EMPTY);

  return (
    <form className="form" action={action}>
      <FormFeedback state={state} />

      <div className="field">
        <label htmlFor="profile-name">{en.auth.account.name}</label>
        <input
          className="input"
          id="profile-name"
          name="name"
          autoComplete="name"
          defaultValue={name}
          required
        />
        <FieldError message={state.fieldErrors?.['name']} />
      </div>

      <div className="field">
        <label htmlFor="profile-whatsapp">
          {en.auth.account.whatsapp}{' '}
          <span className="muted field-optional">{en.auth.account.whatsappOptional}</span>
        </label>
        <input
          className="input"
          id="profile-whatsapp"
          name="whatsapp"
          type="tel"
          autoComplete="tel"
          defaultValue={phone}
          placeholder={en.auth.signUp.whatsappPlaceholder}
        />
        <span className="hint">{en.auth.signUp.whatsappHint}</span>
        <FieldError message={state.fieldErrors?.['whatsapp']} />
      </div>

      <SubmitButton label={en.auth.account.saveProfile} pendingLabel={en.auth.reset.submitting} />
    </form>
  );
}
