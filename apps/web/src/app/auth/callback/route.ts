import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/auth/supabase-server';
import { safeCallbackUrl } from '@/lib/auth/redirect';

/**
 * GET /auth/callback
 *
 * Where every link that arrives by email or from Google comes back to: email
 * verification, password recovery, and the Google OAuth redirect. Supabase sends a
 * one-time `code`, which is exchanged here for a session.
 *
 * `next` decides where the user lands afterwards and comes from a URL, so it is
 * passed through the same open-redirect guard as `callbackUrl` — a verification
 * link is exactly the kind of thing that gets forwarded and clicked without
 * looking.
 */
export async function GET(request: NextRequest): Promise<Response> {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get('code');
  const next = safeCallbackUrl(searchParams.get('next'));

  // Supabase reports failures on the link itself, e.g. an expired recovery token.
  const errorCode = searchParams.get('error') ?? searchParams.get('error_code');
  if (errorCode) {
    console.warn('[auth] callback returned an error', { errorCode });
    return NextResponse.redirect(`${origin}/signin?error=link`);
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/signin?error=link`);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.warn('[auth] code exchange failed', { code: error.code });
    return NextResponse.redirect(`${origin}/signin?error=link`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
