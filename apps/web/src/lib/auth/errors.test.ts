import { describe, expect, it } from 'vitest';
import { authErrorMessage, signUpOutcomeMessage } from './errors';
import { en } from '../i18n/en';

/**
 * P1-US-202: "Error messages never reveal whether an email is registered."
 *
 * This is user enumeration, and it matters more here than on most sites: the
 * account holds paid coin balances, so knowing an address is registered tells an
 * attacker where a password-stuffing attempt is worth making.
 *
 * Every path — wrong password, unknown address, reset request, repeated signup —
 * must be indistinguishable from the outside.
 */
describe('authErrorMessage', () => {
  it('returns one identical message for wrong password and unknown email', () => {
    const wrongPassword = authErrorMessage('Invalid login credentials');
    const unknownEmail = authErrorMessage('Email not found');

    expect(wrongPassword).toBe(unknownEmail);
    expect(wrongPassword).toBe(en.auth.errors.invalidCredentials);
  });

  it('never names the email address or says whether it exists', () => {
    const messages = [
      authErrorMessage('Invalid login credentials'),
      authErrorMessage('User already registered'),
      authErrorMessage('Email not confirmed'),
      authErrorMessage('anything unexpected'),
      signUpOutcomeMessage(),
    ];

    for (const message of messages) {
      expect(message).not.toMatch(/already (?:registered|exists|in use)/i);
      expect(message).not.toMatch(/not found|no account|unknown (?:user|email)/i);
      expect(message).not.toMatch(/@/);
    }
  });

  it('falls back to a generic message for anything unrecognised', () => {
    // A provider message must never reach a user verbatim: it leaks internals and
    // is not written for someone whose first language is not English.
    expect(authErrorMessage('PGRST301 jwt expired at row 4')).toBe(en.auth.errors.generic);
    expect(authErrorMessage(undefined)).toBe(en.auth.errors.generic);
    expect(authErrorMessage('')).toBe(en.auth.errors.generic);
  });

  it('does not pass provider text through', () => {
    const leaky = 'duplicate key value violates unique constraint "users_email_key"';
    expect(authErrorMessage(leaky)).not.toContain('users_email_key');
    expect(authErrorMessage(leaky)).not.toContain('duplicate key');
  });

  it('tells an unverified user what to do, since that is their own account', () => {
    // Once someone has proved the password, telling them the address needs
    // verifying reveals nothing they did not already know.
    expect(authErrorMessage('Email not confirmed')).toBe(en.auth.errors.emailNotConfirmed);
  });

  it('says when the rate limit is the reason, so the user does not retype forever', () => {
    expect(authErrorMessage('over_request_rate_limit')).toBe(en.auth.errors.tooManyAttempts);
  });
});

describe('signUpOutcomeMessage', () => {
  it('is the same whether or not the address was already registered', () => {
    // Supabase deliberately returns an obfuscated user for a repeat signup; the UI
    // has to keep that promise instead of undoing it.
    expect(signUpOutcomeMessage()).toBe(en.auth.signUp.checkYourEmail);
  });
});
