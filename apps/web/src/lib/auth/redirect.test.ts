import { describe, expect, it } from 'vitest';
import { safeCallbackUrl } from './redirect';

/**
 * P1-US-202 requires post-login redirect to `callbackUrl`. That parameter is
 * attacker-controlled, so it is the classic open-redirect hole: a link to
 * `/signin?callbackUrl=https://evil.example` sends a freshly authenticated user
 * straight off the site, and the address bar said our domain the whole way.
 *
 * Only same-origin relative paths survive.
 */
describe('safeCallbackUrl', () => {
  it('accepts an ordinary internal path', () => {
    expect(safeCallbackUrl('/projects/new')).toBe('/projects/new');
    expect(safeCallbackUrl('/account')).toBe('/account');
  });

  it('keeps the query string and fragment of an internal path', () => {
    expect(safeCallbackUrl('/samples?category=Kids')).toBe('/samples?category=Kids');
    expect(safeCallbackUrl('/pricing#coins')).toBe('/pricing#coins');
  });

  it.each([
    'https://evil.example',
    'http://evil.example/path',
    '//evil.example',
    '//evil.example/path',
    'https:/evil.example',
    'javascript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'vbscript:msgbox(1)',
  ])('rejects %s', (candidate) => {
    expect(safeCallbackUrl(candidate)).toBe('/');
  });

  it('rejects a backslash-prefixed path, which some browsers treat as a scheme-relative URL', () => {
    expect(safeCallbackUrl('\\\\evil.example')).toBe('/');
    expect(safeCallbackUrl('/\\evil.example')).toBe('/');
  });

  it('rejects an encoded scheme-relative URL', () => {
    expect(safeCallbackUrl('%2F%2Fevil.example')).toBe('/');
    expect(safeCallbackUrl('/%2F%2Fevil.example')).toBe('/');
  });

  it('rejects anything that does not start with a single slash', () => {
    expect(safeCallbackUrl('projects/new')).toBe('/');
    expect(safeCallbackUrl('')).toBe('/');
    expect(safeCallbackUrl(null)).toBe('/');
    expect(safeCallbackUrl(undefined)).toBe('/');
  });

  it('never returns the auth pages themselves, which would loop', () => {
    expect(safeCallbackUrl('/signin')).toBe('/');
    expect(safeCallbackUrl('/signup')).toBe('/');
    expect(safeCallbackUrl('/signin?callbackUrl=/account')).toBe('/');
  });
});
