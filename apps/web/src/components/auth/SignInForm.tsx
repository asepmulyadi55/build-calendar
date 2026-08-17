'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { signInAction, type ActionState } from '@/lib/auth/actions';
import { en } from '@/lib/i18n/en';
import { routes } from '@/lib/routes';
import { FieldError, FormFeedback } from './FormFeedback';
import { GoogleButton } from './GoogleButton';
import { PasswordField } from './PasswordField';
import { SubmitButton } from './SubmitButton';

const EMPTY: ActionState = {};

export function SignInForm({ callbackUrl }: { callbackUrl: string }) {
  const [state, action] = useActionState(signInAction, EMPTY);

  return (
    <>
      <form className="form" action={action}>
        <input type="hidden" name="callbackUrl" value={callbackUrl} />

        <FormFeedback state={state} />

        <div className="field">
          <label htmlFor="signin-email">{en.auth.signIn.email}</label>
          <input
            className="input"
            id="signin-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder={en.auth.signIn.emailPlaceholder}
            required
          />
          <FieldError message={state.fieldErrors?.['email']} />
        </div>

        <PasswordField
          name="password"
          label={en.auth.signIn.password}
          placeholder={en.auth.signIn.passwordPlaceholder}
          autoComplete="current-password"
          error={state.fieldErrors?.['password']}
          hint={
            <span className="hint">
              <Link href={routes.forgotPassword}>{en.auth.signIn.forgotPassword}</Link>
            </span>
          }
        />

        {/* Block, not flex: the label is a sentence. See ds.css `.check`. */}
        <label className="check">
          <input type="checkbox" name="rememberMe" defaultChecked />
          {en.auth.signIn.rememberMe}
        </label>

        <SubmitButton label={en.auth.signIn.submit} pendingLabel={en.auth.signIn.submitting} />

        <div className="divider">{en.auth.signIn.or}</div>
        <GoogleButton callbackUrl={callbackUrl} />
      </form>

      <p className="small muted auth-alt">
        {en.auth.signIn.noAccount} <Link href={routes.signUp}>{en.auth.signIn.createAccount}</Link>
      </p>
    </>
  );
}
