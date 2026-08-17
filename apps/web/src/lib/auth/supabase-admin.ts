import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { supabaseUrl } from './config';

/**
 * The service-role client. Bypasses RLS entirely — this is the database's master
 * key (§5.3).
 *
 * `server-only` at the top of this file is what makes importing it from a client
 * component a build error rather than a leaked key.
 *
 * Used for exactly two things in Epic 2: reading a profile the caller owns during
 * sign-in checks, and marking an account deleted. Everything else goes through the
 * user's own client so RLS still applies.
 */
export function createSupabaseAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');

  return createClient(supabaseUrl(), serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
