import 'server-only';
import { prisma } from '@buildcalendar/db';

/**
 * Site settings, read from the `settings` table (P1-US-703 edits them).
 *
 * Nothing here is hardcoded: the WhatsApp number, contact address and site name
 * are the owner's to change from the admin panel, never in a deploy.
 *
 * Public marketing pages must render even when the database is unreachable —
 * a visitor reading the pricing page should not see an error because Supabase is
 * having a bad minute. Reads degrade to empty values, and the components decide
 * what to hide. The failure is logged, never swallowed.
 */
export interface SiteSettings {
  siteName: string | null;
  contactEmail: string | null;
  whatsappNumber: string | null;
}

const EMPTY: SiteSettings = {
  siteName: null,
  contactEmail: null,
  whatsappNumber: null,
};

function asString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

export async function getSiteSettings(): Promise<SiteSettings> {
  try {
    const rows = await prisma.setting.findMany({
      where: { key: { in: ['site_name', 'contact_email', 'whatsapp_number'] } },
    });

    const byKey = new Map(rows.map((row) => [row.key, row.valueJson]));

    return {
      siteName: asString(byKey.get('site_name')),
      contactEmail: asString(byKey.get('contact_email')),
      whatsappNumber: asString(byKey.get('whatsapp_number')),
    };
  } catch (error) {
    console.error('[settings] read failed, rendering without them', {
      message: error instanceof Error ? error.message : 'unknown error',
    });
    return EMPTY;
  }
}
