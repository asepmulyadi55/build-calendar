import type { ActionState } from '@/lib/auth/actions';

/**
 * The one place a form's outcome is rendered.
 *
 * Every message comes from `en.ts` via the action, so nothing here can invent
 * copy — which is what keeps the "never reveal whether an email is registered"
 * rule enforceable in one file instead of five.
 */
export function FormFeedback({ state }: { state: ActionState }) {
  if (state.error) {
    return (
      <p className="auth-error" role="alert">
        {state.error}
      </p>
    );
  }

  if (state.success) {
    return (
      <p className="auth-success" role="status">
        {state.success}
      </p>
    );
  }

  return null;
}

export function FieldError({ message }: { message: string | undefined }) {
  if (!message) return null;
  return <span className="field-error">{message}</span>;
}
