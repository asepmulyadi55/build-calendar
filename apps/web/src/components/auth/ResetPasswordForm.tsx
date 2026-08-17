'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { resetPasswordAction, type ActionState } from '@/lib/auth/actions';
import { en } from '@/lib/i18n/en';
import { routes } from '@/lib/routes';
import { FieldError, FormFeedback } from './FormFeedback';
import { PasswordField } from './PasswordField';
import { SubmitButton } from './SubmitButton';

const EMPTY: ActionState = {};

export function ResetPasswordForm() {
  const [state, action] = useActionState(resetPasswordAction, EMPTY);

  return (
    <>
      <form className="form" action={action}>
        <FormFeedback state={state} />

        <PasswordField
          name="password"
          label={en.auth.reset.newPassword}
          autoComplete="new-password"
          showStrength
          error={state.fieldErrors?.['password']}
        />

        <div className="field">
          <label htmlFor="reset-confirm">{en.auth.reset.confirmPassword}</label>
          <input
            className="input"
            id="reset-confirm"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
          />
          <FieldError message={state.fieldErrors?.['confirmPassword']} />
        </div>

        <SubmitButton label={en.auth.reset.submit} pendingLabel={en.auth.reset.submitting} />
      </form>

      <p className="small muted auth-alt">
        <Link href={routes.forgotPassword}>{en.auth.reset.requestAnother}</Link>
      </p>
    </>
  );
}
