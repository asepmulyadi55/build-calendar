'use client';

import { useActionState } from 'react';
import { resendVerificationAction, type ActionState } from '@/lib/auth/actions';
import { en } from '@/lib/i18n/en';
import { FormFeedback } from './FormFeedback';
import { SubmitButton } from './SubmitButton';

const EMPTY: ActionState = {};

/**
 * Resending is rate limited on the same bucket as signup (NFR-S02), because an
 * unlimited resend button is a free way to send mail from our domain to any
 * address in the world.
 */
export function ResendVerification() {
  const [state, action] = useActionState(async (_previous: ActionState) => {
    return resendVerificationAction();
  }, EMPTY);

  return (
    <form className="form" action={action}>
      <FormFeedback state={state} />
      <SubmitButton label={en.auth.verify.resend} pendingLabel={en.auth.verify.resending} />
    </form>
  );
}
