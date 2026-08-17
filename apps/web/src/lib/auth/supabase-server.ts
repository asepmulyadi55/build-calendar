import 'server-only';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import {
  REMEMBER_ME_COOKIE,
  REMEMBER_ME_MAX_AGE_SECONDS,
  supabaseAnonKey,
  supabaseUrl,
} from './config';

/**
 * Supabase client for server components, route handlers and server actions.
 *
 * Uses the anon key and the caller's cookies, so it acts as the signed-in user and
 * RLS applies. Anything that must bypass RLS uses `supabase-admin.ts` instead, and
 * that distinction is the whole security model — do not blur it for convenience.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  const remembered = cookieStore.get(REMEMBER_ME_COOKIE)?.value === '1';

  return createServerClient(supabaseUrl(), supabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, {
              ...options,
              // P1-US-202: 30 days when the user asked to stay signed in, a
              // session cookie otherwise.
              ...(remembered ? { maxAge: REMEMBER_ME_MAX_AGE_SECONDS } : { maxAge: undefined }),
            });
          }
        } catch {
          // Called from a server component, where cookies are read-only. The
          // middleware refreshes the session instead, so this is expected rather
          // than an error worth logging on every render.
        }
      },
    },
  });
}
