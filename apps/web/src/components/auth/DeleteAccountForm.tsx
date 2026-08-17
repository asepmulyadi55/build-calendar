'use client';

import { useActionState } from 'react';
import { deleteAccountAction, type ActionState } from '@/lib/auth/actions';
import { en } from '@/lib/i18n/en';
import { FieldError, FormFeedback } from './FormFeedback';
import { SubmitButton } from './SubmitButton';

const EMPTY: ActionState = {};

/**
 * Deletion requires typing the account's own email (P1-US-203). A confirm dialog
 * is clicked through on reflex; typing an address is not.
 */
export function DeleteAccountForm({ email }: { email: string }) {
  const [state, action] = useActionState(deleteAccountAction, EMPTY);

  return (
    <form className="form" action={action}>
      <FormFeedback state={state} />

      <div className="field">
        <label htmlFor="delete-confirm">{en.auth.account.dangerConfirmLabel}</label>
        <input
          className="input"
          id="delete-confirm"
          name="confirmEmail"
          type="email"
          autoComplete="off"
          placeholder={email}
          required
        />
        <FieldError message={state.fieldErrors?.['confirmEmail']} />
      </div>

      <SubmitButton
        label={en.auth.account.dangerSubmit}
        pendingLabel={en.auth.account.dangerSubmitting}
      />
    </form>
  );
}
