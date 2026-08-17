'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { signUpAction, type ActionState } from '@/lib/auth/actions';
import { en } from '@/lib/i18n/en';
import { routes } from '@/lib/routes';
import { FieldError, FormFeedback } from './FormFeedback';
import { GoogleButton } from './GoogleButton';
import { PasswordField } from './PasswordField';
import { SubmitButton } from './SubmitButton';

const EMPTY: ActionState = {};

export function SignUpForm({ callbackUrl }: { callbackUrl: string }) {
  const [state, action] = useActionState(signUpAction, EMPTY);

  // On success the form is replaced by the message. It is deliberately the same
  // message whether or not the address was already registered.
  if (state.success) {
    return (
      <>
        <FormFeedback state={state} />
        <p className="small muted auth-alt">
          {en.auth.signUp.haveAccount} <Link href={routes.signIn}>{en.auth.signUp.signInLink}</Link>
        </p>
      </>
    );
  }

  return (
    <>
      <form className="form" action={action}>
        <FormFeedback state={state} />

        <div className="field">
          <label htmlFor="signup-name">{en.auth.signUp.name}</label>
          <input
            className="input"
            id="signup-name"
            name="name"
            autoComplete="name"
            placeholder={en.auth.signUp.namePlaceholder}
            required
          />
          <FieldError message={state.fieldErrors?.['name']} />
        </div>

        <div className="field">
          <label htmlFor="signup-email">{en.auth.signUp.email}</label>
          <input
            className="input"
            id="signup-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder={en.auth.signUp.emailPlaceholder}
            required
          />
          <FieldError message={state.fieldErrors?.['email']} />
        </div>

        <div className="field">
          <label htmlFor="signup-whatsapp">
            {en.auth.signUp.whatsapp}{' '}
            <span className="muted field-optional">{en.auth.signUp.whatsappOptional}</span>
          </label>
          <input
            className="input"
            id="signup-whatsapp"
            name="whatsapp"
            type="tel"
            autoComplete="tel"
            placeholder={en.auth.signUp.whatsappPlaceholder}
          />
          <span className="hint">{en.auth.signUp.whatsappHint}</span>
          <FieldError message={state.fieldErrors?.['whatsapp']} />
        </div>

        <PasswordField
          name="password"
          label={en.auth.signUp.password}
          placeholder={en.auth.signUp.passwordPlaceholder}
          autoComplete="new-password"
          showStrength
          error={state.fieldErrors?.['password']}
        />

        {/* Block, not flex: this sentence contains two links, and a flex parent
            would turn every text node and anchor into its own column. See ds.css. */}
        <label className="check">
          <input type="checkbox" name="terms" required />
          {en.auth.signUp.termsLead}
          <Link href={routes.terms}>{en.auth.signUp.termsLink}</Link>
          {en.auth.signUp.termsMiddle}
          <Link href={routes.privacy}>{en.auth.signUp.privacyLink}</Link>
          {en.auth.signUp.termsTail}
        </label>
        <FieldError message={state.fieldErrors?.['terms']} />

        <SubmitButton label={en.auth.signUp.submit} pendingLabel={en.auth.signUp.submitting} />

        <div className="divider">{en.auth.signUp.or}</div>
        <GoogleButton callbackUrl={callbackUrl} />
      </form>

      <p className="small muted auth-alt">
        {en.auth.signUp.haveAccount} <Link href={routes.signIn}>{en.auth.signUp.signInLink}</Link>
      </p>
    </>
  );
}
