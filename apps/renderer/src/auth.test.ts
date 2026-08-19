import { describe, expect, it } from 'vitest';
import { secretMatches } from './auth';

/**
 * P1-US-601: requests are authenticated with `RENDERER_SHARED_SECRET`, and the
 * service is not publicly exposed.
 */
describe('secretMatches', () => {
  it('accepts the configured secret', () => {
    expect(secretMatches('s3cret-value', 's3cret-value')).toBe(true);
  });

  it('rejects a wrong secret of the same length', () => {
    expect(secretMatches('s3cret-value', 's3cret-valuf')).toBe(false);
  });

  it('rejects a prefix, which is what a byte-at-a-time attack sends', () => {
    expect(secretMatches('s3cret-value', 's3cret')).toBe(false);
  });

  it('rejects a missing header', () => {
    expect(secretMatches('s3cret-value', undefined)).toBe(false);
    expect(secretMatches('s3cret-value', '')).toBe(false);
  });

  it('matches nothing when no secret is configured', () => {
    // An unconfigured service must be closed, not open to everyone.
    expect(secretMatches('', '')).toBe(false);
    expect(secretMatches('', undefined)).toBe(false);
    expect(secretMatches('', 'anything')).toBe(false);
  });
});
