import { describe, expect, it } from 'vitest';
import { buildWhatsAppUrl, normaliseWhatsAppNumber } from './whatsapp';

/**
 * P1-US-104. The number comes from `settings.whatsapp_number` and is never
 * hardcoded — the owner changes it in the admin panel, not in a deploy.
 */
describe('normaliseWhatsAppNumber', () => {
  it('converts the Indonesian local form to international', () => {
    expect(normaliseWhatsAppNumber('081234567890')).toBe('6281234567890');
  });

  it('accepts the forms an admin is likely to type', () => {
    expect(normaliseWhatsAppNumber('+62 812-3456-7890')).toBe('6281234567890');
    expect(normaliseWhatsAppNumber('62 812 3456 7890')).toBe('6281234567890');
    expect(normaliseWhatsAppNumber('(0812) 3456-7890')).toBe('6281234567890');
  });

  it('leaves an already-normalised number alone', () => {
    expect(normaliseWhatsAppNumber('6281234567890')).toBe('6281234567890');
  });

  it('returns null for an unusable value rather than a broken link', () => {
    // An unset setting must hide the button, not render wa.me/undefined.
    expect(normaliseWhatsAppNumber('')).toBeNull();
    expect(normaliseWhatsAppNumber('   ')).toBeNull();
    expect(normaliseWhatsAppNumber('not a number')).toBeNull();
    expect(normaliseWhatsAppNumber('123')).toBeNull();
  });
});

describe('buildWhatsAppUrl', () => {
  it('builds a wa.me link with the message encoded', () => {
    const url = buildWhatsAppUrl('081234567890', 'Hi, I have a question about desk calendars');

    expect(url).toBe(
      'https://wa.me/6281234567890?text=Hi%2C%20I%20have%20a%20question%20about%20desk%20calendars',
    );
  });

  it('encodes characters that would otherwise break the query string', () => {
    const url = buildWhatsAppUrl('6281234567890', 'Project #KC-4821 & 2027?');

    expect(url).toContain('%23KC-4821');
    expect(url).toContain('%26');
    expect(url).not.toMatch(/[ ]/);
  });

  it('returns null when the number is unusable', () => {
    expect(buildWhatsAppUrl('', 'anything')).toBeNull();
    expect(buildWhatsAppUrl(null, 'anything')).toBeNull();
  });

  it('omits the text parameter entirely when there is no message', () => {
    expect(buildWhatsAppUrl('6281234567890', '')).toBe('https://wa.me/6281234567890');
  });
});
