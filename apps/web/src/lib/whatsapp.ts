/**
 * WhatsApp deep links (P1-US-104).
 *
 * The number always comes from `settings.whatsapp_number` — the owner changes it in
 * the admin panel, never in a deploy. Nothing here may contain a literal number,
 * and a test asserts that across the whole source tree.
 */

/**
 * Accepts what an admin actually types — `0812…`, `+62 812-3456-7890`,
 * `(0812) 3456-7890` — and returns the digits WhatsApp expects.
 *
 * Returns `null` rather than a broken value, so an unset or malformed setting
 * hides the button instead of rendering a link to `wa.me/undefined`.
 */
export function normaliseWhatsAppNumber(raw: string | null | undefined): string | null {
  if (!raw) return null;

  const digits = raw.replace(/\D/g, '');
  if (digits.length === 0) return null;

  let international: string;
  if (digits.startsWith('62')) international = digits;
  else if (digits.startsWith('0')) international = `62${digits.slice(1)}`;
  else if (digits.startsWith('8')) international = `62${digits}`;
  else return null;

  // Indonesian mobile numbers land between 10 and 15 digits once prefixed.
  if (international.length < 10 || international.length > 15) return null;

  return international;
}

/**
 * `https://wa.me/{number}?text={encoded}`.
 *
 * @param message context-aware prefill, e.g. "Hi, I have a question about desk
 *   calendars". Pass an empty string to link without one.
 */
export function buildWhatsAppUrl(
  rawNumber: string | null | undefined,
  message: string,
): string | null {
  const number = normaliseWhatsAppNumber(rawNumber);
  if (!number) return null;

  const base = `https://wa.me/${number}`;
  if (!message) return base;

  return `${base}?text=${encodeURIComponent(message)}`;
}
