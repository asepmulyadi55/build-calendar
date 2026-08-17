'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { requestPasswordResetAction, type ActionState } from '@/lib/auth/actions';
import { en } from '@/lib/i18n/en';
import { routes } from '@/lib/routes';
import { FieldError, FormFeedback } from './FormFeedback';
import { SubmitButton } from './SubmitButton';

const EMPTY: ActionState = {};

export function ForgotPasswordForm() {
  const [state, action] = useActionState(requestPasswordResetAction, EMPTY);

  // Identical outcome whether or not the address has an account.
  if (state.success) {
    return (
      <>
        <FormFeedback state={state} />
        <p className="small muted auth-alt">
          <Link href={routes.signIn}>{en.auth.forgot.backToSignIn}</Link>
        </p>
      </>
    );
  }

  return (
    <>
      <form className="form" action={action}>
        <FormFeedback state={state} />
        <div className="field">
          <label htmlFor="forgot-email">{en.auth.signIn.email}</label>
          <input
            className="input"
            id="forgot-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder={en.auth.signIn.emailPlaceholder}
            required
          />
          <FieldError message={state.fieldErrors?.['email']} />
        </div>
        <SubmitButton label={en.auth.forgot.submit} pendingLabel={en.auth.forgot.submitting} />
      </form>
      <p className="small muted auth-alt">
        <Link href={routes.signIn}>{en.auth.forgot.backToSignIn}</Link>
      </p>
    </>
  );
}
