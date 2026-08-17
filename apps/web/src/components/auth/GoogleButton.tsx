'use client';

import { useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/auth/supabase-browser';
import { en } from '@/lib/i18n/en';

/**
 * Google sign-in (P1-US-201). A Google account arrives already verified, so it
 * skips the email step entirely.
 *
 * The redirect has to be started by the browser, which is why this is a client
 * component. `next` goes through `safeCallbackUrl` when the callback route reads
 * it back.
 */
export function GoogleButton({ callbackUrl }: { callbackUrl: string }) {
  const [pending, setPending] = useState(false);

  return (
    <button
      type="button"
      className="btn btn-ghost btn-block"
      disabled={pending}
      onClick={() => {
        setPending(true);
        const supabase = createSupabaseBrowserClient();
        void supabase.auth
          .signInWithOAuth({
            provider: 'google',
            options: {
              redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(callbackUrl)}`,
            },
          })
          .catch(() => setPending(false));
      }}
    >
      {en.auth.signIn.google}
    </button>
  );
}
