'use client';

import { useActionState } from 'react';
import { updatePasswordAction, type ActionState } from '@/lib/auth/actions';
import { en } from '@/lib/i18n/en';
import { FormFeedback } from './FormFeedback';
import { PasswordField } from './PasswordField';
import { SubmitButton } from './SubmitButton';

const EMPTY: ActionState = {};

export function UpdatePasswordForm() {
  const [state, action] = useActionState(updatePasswordAction, EMPTY);

  return (
    <form className="form" action={action}>
      <FormFeedback state={state} />

      {/* The current password is required so a borrowed unlocked laptop cannot be
          used to take the account and its coin balance. */}
      <PasswordField
        name="currentPassword"
        label={en.auth.account.currentPassword}
        autoComplete="current-password"
        error={state.fieldErrors?.['currentPassword']}
      />

      <PasswordField
        name="newPassword"
        label={en.auth.account.newPassword}
        autoComplete="new-password"
        showStrength
        error={state.fieldErrors?.['newPassword']}
      />

      <SubmitButton label={en.auth.account.savePassword} pendingLabel={en.auth.reset.submitting} />
    </form>
  );
}
