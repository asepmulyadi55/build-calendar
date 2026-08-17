/**
 * Auth configuration shared by the server, the browser and the middleware.
 *
 * No secret lives here. `NEXT_PUBLIC_SUPABASE_ANON_KEY` is public by design and is
 * only safe because every table has RLS with a deny-all policy (§5.3). The
 * service-role key is read in `supabase-admin.ts` and never from a
 * `NEXT_PUBLIC_` variable.
 */

/** P1-US-202: "Remember me" extends the session to 30 days. */
export const REMEMBER_ME_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

/**
 * The cookie that records the choice. Without it, auth cookies are session
 * cookies and disappear when the browser closes — the safer default on the shared
 * and borrowed devices a lot of Indonesian users have.
 */
export const REMEMBER_ME_COOKIE = 'bc-remember';

export function supabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set');
  return url;
}

export function supabaseAnonKey(): string {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!key) throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is not set');
  return key;
}

/** Absolute URLs for links that arrive by email and must come back to us. */
export function appUrl(path = ''): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  return `${base.replace(/\/$/, '')}${path}`;
}
