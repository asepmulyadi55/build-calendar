import { en } from '../i18n/en';

/**
 * Turns a provider error into something a user should see (P1-US-202).
 *
 * Two rules govern everything here.
 *
 * **Never reveal whether an email is registered.** Wrong password and unknown
 * address return the identical message. This is user enumeration, and it matters
 * more on this site than most: accounts hold paid coin balances, so confirming an
 * address tells an attacker where password stuffing is worth the effort.
 *
 * **Never pass provider text through.** It leaks internals — table names,
 * constraint names, row numbers — and it is not written for a reader whose first
 * language is not English.
 */
export function authErrorMessage(providerMessage: string | null | undefined): string {
  if (!providerMessage) return en.auth.errors.generic;

  const message = providerMessage.toLowerCase();

  // Deliberately the same answer for both. Do not split these apart.
  if (
    message.includes('invalid login credentials') ||
    message.includes('invalid credentials') ||
    message.includes('email not found') ||
    message.includes('user not found')
  ) {
    return en.auth.errors.invalidCredentials;
  }

  // Safe to be specific: the password was already correct, so this tells the
  // account's owner something they can act on and an attacker nothing new.
  if (message.includes('email not confirmed') || message.includes('email_not_confirmed')) {
    return en.auth.errors.emailNotConfirmed;
  }

  if (
    message.includes('rate limit') ||
    message.includes('over_request_rate_limit') ||
    message.includes('too many')
  ) {
    return en.auth.errors.tooManyAttempts;
  }

  if (message.includes('token has expired') || message.includes('otp_expired')) {
    return en.auth.errors.linkExpired;
  }

  if (message.includes('same password')) {
    return en.auth.errors.samePassword;
  }

  return en.auth.errors.generic;
}

/**
 * The message shown after a signup attempt — identical whether the address was
 * new or already registered.
 *
 * Supabase returns an obfuscated user for a repeat signup precisely so this can be
 * true. Reporting "that email is taken" would undo it.
 */
export function signUpOutcomeMessage(): string {
  return en.auth.signUp.checkYourEmail;
}
