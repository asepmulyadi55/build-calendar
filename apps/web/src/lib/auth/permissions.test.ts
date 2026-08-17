import { describe, expect, it } from 'vitest';
import { canSpendCoins, canTopUp, verificationState, type AuthUserLike } from './permissions';

/**
 * P1-US-201: "Users may sign in before verifying but cannot top up or unlock
 * until verified."
 *
 * This is a server-side rule. The UI hiding a button is a courtesy; the check
 * that matters runs where the coin would actually move (Epic 5), and it reads
 * these predicates.
 */
const user = (over: Partial<AuthUserLike> = {}): AuthUserLike => ({
  id: '11111111-1111-1111-1111-111111111111',
  emailConfirmedAt: new Date('2027-01-01T00:00:00Z'),
  deletedAt: null,
  ...over,
});

describe('verificationState', () => {
  it('is verified once the provider has confirmed the address', () => {
    expect(verificationState(user())).toBe('verified');
  });

  it('is unverified when confirmation has not happened', () => {
    expect(verificationState(user({ emailConfirmedAt: null }))).toBe('unverified');
  });

  it('is deleted for an account scheduled for removal, whatever its email state', () => {
    expect(verificationState(user({ deletedAt: new Date() }))).toBe('deleted');
    expect(verificationState(user({ emailConfirmedAt: null, deletedAt: new Date() }))).toBe(
      'deleted',
    );
  });

  it('is anonymous with no user at all', () => {
    expect(verificationState(null)).toBe('anonymous');
  });
});

describe('canTopUp / canSpendCoins', () => {
  it('allows a verified account', () => {
    expect(canTopUp(user())).toBe(true);
    expect(canSpendCoins(user())).toBe(true);
  });

  it('refuses an unverified account — the whole point of the rule', () => {
    const unverified = user({ emailConfirmedAt: null });
    expect(canTopUp(unverified)).toBe(false);
    expect(canSpendCoins(unverified)).toBe(false);
  });

  it('refuses an account scheduled for deletion', () => {
    expect(canTopUp(user({ deletedAt: new Date() }))).toBe(false);
    expect(canSpendCoins(user({ deletedAt: new Date() }))).toBe(false);
  });

  it('refuses an anonymous visitor', () => {
    expect(canTopUp(null)).toBe(false);
    expect(canSpendCoins(null)).toBe(false);
  });

  it('defaults to refusing when the state is unreadable', () => {
    // Failing closed: a malformed record must not become a free coin.
    expect(canSpendCoins({ id: 'x' } as unknown as AuthUserLike)).toBe(false);
  });
});
