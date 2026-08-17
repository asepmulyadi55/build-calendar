import { en } from '../i18n/en';

/**
 * Password policy (P1-US-201).
 *
 * The floor and the meter are separate on purpose. `validatePassword` is the rule,
 * enforced on the server; `passwordStrength` is advice shown as the user types. If
 * the meter could reject, it would become a second policy nobody wrote down.
 *
 * Hashing is the auth provider's job (NFR-S01). Nothing here touches a hash.
 */
export const MIN_PASSWORD_LENGTH = 8;

/**
 * bcrypt-family hashing silently truncates past 72 bytes, and an unbounded input
 * is a cheap way to burn CPU on a 1 GB box.
 */
export const MAX_PASSWORD_LENGTH = 72;

export type PasswordProblem = 'required' | 'whitespaceOnly' | 'tooShort' | 'tooLong';

export function validatePassword(password: string): PasswordProblem | null {
  if (password.length === 0) return 'required';
  if (password.trim().length === 0) return 'whitespaceOnly';
  if (password.length < MIN_PASSWORD_LENGTH) return 'tooShort';
  if (password.length > MAX_PASSWORD_LENGTH) return 'tooLong';
  return null;
}

/** The handful of passwords a stuffing list tries first. */
const COMMON = new Set([
  'password',
  'password1',
  '12345678',
  '123456789',
  'qwerty123',
  'iloveyou',
  'kalender',
  'indonesia',
  'admin123',
]);

export interface PasswordStrength {
  /** 0 (unusable) to 4 (strong). */
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
}

export function passwordStrength(password: string): PasswordStrength {
  let score = 0;

  if (password.length >= MIN_PASSWORD_LENGTH) score++;
  if (password.length >= 12) score++;
  if (password.length >= 16) score++;

  const classes = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((pattern) =>
    pattern.test(password),
  ).length;
  if (classes >= 3) score++;

  // A long string of one repeated character is not strong, however long it is.
  const unique = new Set(password).size;
  if (unique <= 2) score = Math.min(score, 1);
  if (COMMON.has(password.toLowerCase())) score = Math.min(score, 1);

  const clamped = Math.max(0, Math.min(4, score)) as PasswordStrength['score'];
  return { score: clamped, label: en.auth.password.strength[clamped] };
}
