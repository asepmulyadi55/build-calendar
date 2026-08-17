import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { REMEMBER_ME_COOKIE, REMEMBER_ME_MAX_AGE_SECONDS } from '@/lib/auth/config';

/**
 * Refreshes the Supabase session on every request.
 *
 * Server components cannot write cookies, so without this the access token would
 * expire and never renew — the user appears signed out at random. This is the one
 * place the refreshed cookie can be written.
 *
 * It also guards the routes that need an account. That is a redirect for
 * convenience, not the security boundary: the pages themselves call
 * `requireUser` / `requireVerifiedUser`, and anything that spends coins checks
 * again at the point the money moves.
 */
const PROTECTED_PREFIXES = ['/account', '/projects', '/coins'];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Without credentials there is no session to refresh. Public pages must still
  // render, so this degrades rather than throwing.
  if (!url || !anonKey) return response;

  const remembered = request.cookies.get(REMEMBER_ME_COOKIE)?.value === '1';

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, {
            ...options,
            // P1-US-202: 30 days when asked, a session cookie otherwise.
            ...(remembered ? { maxAge: REMEMBER_ME_MAX_AGE_SECONDS } : { maxAge: undefined }),
          });
        }
      },
    },
  });

  // `getUser` revalidates with the auth server; `getSession` only reads a cookie
  // the client could have edited. Never authorise on the latter.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const needsAccount = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (needsAccount && !user) {
    const signIn = request.nextUrl.clone();
    signIn.pathname = '/signin';
    signIn.search = `?callbackUrl=${encodeURIComponent(pathname + request.nextUrl.search)}`;
    return NextResponse.redirect(signIn);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Everything except static assets and image files. The session still has to
     * refresh on public pages, because that is where a returning visitor lands.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
