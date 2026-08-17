'use client';

import { useFormStatus } from 'react-dom';

/**
 * Disabled while the action runs, which is also what stops a double submit —
 * relevant on signup, where a second request would burn one of the three per hour
 * NFR-S02 allows.
 */
export function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();

  return (
    <button type="submit" className="btn btn-primary btn-block" disabled={pending}>
      {pending ? pendingLabel : label}
    </button>
  );
}
