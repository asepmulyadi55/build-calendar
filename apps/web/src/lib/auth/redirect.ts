/**
 * Post-login redirect (P1-US-202).
 *
 * `callbackUrl` arrives from the query string, so it is attacker-controlled. An
 * unchecked value is an open redirect: a link to
 * `/signin?callbackUrl=https://evil.example` walks a freshly authenticated user
 * off the site while the address bar said our domain the whole way.
 *
 * Only same-origin relative paths survive, and never an auth page — sending
 * someone back to `/signin` after signing in is a loop.
 */
const AUTH_PATHS = [
  '/signin',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/auth',
];

export const DEFAULT_REDIRECT = '/';

/** Control characters can split headers or confuse a URL parser. */
function hasControlCharacter(value: string): boolean {
  for (let index = 0; index < value.length; index++) {
    const code = value.charCodeAt(index);
    if (code <= 0x1f || code === 0x7f) return true;
  }
  return false;
}

export function safeCallbackUrl(candidate: string | null | undefined): string {
  if (!candidate) return DEFAULT_REDIRECT;

  const value = candidate.trim();

  // A single leading slash and nothing else. `//host` and `/\host` are both read
  // as scheme-relative URLs by browsers, and `javascript:` never starts with one.
  if (!value.startsWith('/')) return DEFAULT_REDIRECT;
  if (value.startsWith('//') || value.startsWith('/\\')) return DEFAULT_REDIRECT;

  // Decode once, so an encoded `%2F%2Fhost` cannot slip past the check above.
  let decoded: string;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    return DEFAULT_REDIRECT;
  }
  if (decoded.startsWith('//') || decoded.startsWith('/\\')) return DEFAULT_REDIRECT;
  if (hasControlCharacter(decoded)) return DEFAULT_REDIRECT;

  const path = value.split(/[?#]/)[0] ?? '';
  if (AUTH_PATHS.some((auth) => path === auth || path.startsWith(`${auth}/`))) {
    return DEFAULT_REDIRECT;
  }

  return value;
}
