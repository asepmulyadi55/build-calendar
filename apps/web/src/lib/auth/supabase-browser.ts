'use client';

import { createBrowserClient } from '@supabase/ssr';
import { supabaseAnonKey, supabaseUrl } from './config';

/**
 * Supabase client for client components.
 *
 * Only ever holds the anon key. Google sign-in starts here because the OAuth
 * redirect has to be initiated by the browser.
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient(supabaseUrl(), supabaseAnonKey());
}
