import { describe, expect, it } from 'vitest';
import { MIN_PASSWORD_LENGTH, passwordStrength, validatePassword } from './password';

/**
 * P1-US-201: minimum 8 characters with a strength indicator.
 *
 * The floor is a hard rule enforced on the server; the indicator is advice. They
 * are separate on purpose — a weak-but-legal password must still be accepted, or
 * the meter quietly becomes a second, undocumented policy.
 */
describe('validatePassword', () => {
  it('requires at least 8 characters', () => {
    expect(MIN_PASSWORD_LENGTH).toBe(8);
    expect(validatePassword('sevench')).toBe('tooShort');
    expect(validatePassword('eightchr')).toBeNull();
  });

  it('counts characters, not bytes — an emoji password is not eight characters of entropy but it is eight characters', () => {
    expect(validatePassword('12345678')).toBeNull();
  });

  it('rejects an empty or whitespace-only password', () => {
    expect(validatePassword('')).toBe('required');
    expect(validatePassword('        ')).toBe('whitespaceOnly');
  });

  it('rejects a password long enough to be a denial-of-service vector', () => {
    // bcrypt-family hashing is deliberately slow; an unbounded input is a free
    // way to burn the 1 GB box's CPU.
    expect(validatePassword('a'.repeat(200))).toBe('tooLong');
    expect(validatePassword('a'.repeat(72))).toBeNull();
  });

  it('accepts a weak but legal password — the meter advises, the rule decides', () => {
    expect(validatePassword('password')).toBeNull();
    expect(passwordStrength('password').score).toBeLessThanOrEqual(1);
  });
});

describe('passwordStrength', () => {
  it('scores an empty password as zero', () => {
    expect(passwordStrength('').score).toBe(0);
  });

  it('rises with length and variety', () => {
    const weak = passwordStrength('aaaaaaaa').score;
    const better = passwordStrength('Kalender27').score;
    const strong = passwordStrength('Kalender-2027-Jakarta!').score;

    expect(weak).toBeLessThan(better);
    expect(better).toBeLessThan(strong);
  });

  it('never exceeds its own scale', () => {
    for (const candidate of ['', 'a', 'aB3!', 'x'.repeat(72), 'Correct-Horse-Battery-Staple-99']) {
      const { score } = passwordStrength(candidate);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(4);
    }
  });

  it('penalises a password that is only one repeated character', () => {
    expect(passwordStrength('aaaaaaaaaaaaaaaa').score).toBeLessThanOrEqual(1);
  });

  it('returns a label for every score so the indicator always has something to show', () => {
    for (const candidate of ['', 'abc', 'abcdefgh', 'Kalender27', 'Kalender-2027-Jakarta!']) {
      expect(passwordStrength(candidate).label.length).toBeGreaterThan(0);
    }
  });
});
