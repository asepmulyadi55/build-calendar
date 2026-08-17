import type { ReactNode } from 'react';
import { SiteNav } from '@/components/marketing/SiteNav';
import { SiteFooter } from '@/components/marketing/SiteFooter';
import { WhatsAppButton } from '@/components/marketing/WhatsAppButton';
import { getSiteSettings } from '@/lib/data/settings';
import { buildWhatsAppUrl } from '@/lib/whatsapp';
import { en } from '@/lib/i18n/en';

/**
 * Shell for every public page: navigation, footer, and the floating WhatsApp
 * button required on all of them (P1-US-104).
 *
 * The number comes from `settings.whatsapp_number` and is resolved here, once, so
 * no page has to think about it and no client bundle ever sees the raw setting.
 */
/**
 * Coin packages, product presets and the WhatsApp number are all admin-editable
 * (BR-C01, P1-US-703). Fully static pages would show whatever the database said at
 * build time, so an edit in the admin panel would need a redeploy to appear —
 * which is the same failure as hardcoding, one step removed.
 *
 * A minute of caching keeps these pages cheap to serve on a 1 GB box while making
 * an admin change visible without a deploy.
 */
export const revalidate = 60;

export default async function MarketingLayout({ children }: { children: ReactNode }) {
  const settings = await getSiteSettings();

  // Built here so the number is resolved once, server-side, and the browser only
  // ever receives finished links.
  const defaultHref = buildWhatsAppUrl(settings.whatsappNumber, en.whatsapp.defaultMessage);
  const links = defaultHref
    ? {
        default: defaultHref,
        pricing: buildWhatsAppUrl(settings.whatsappNumber, en.whatsapp.pricingMessage)!,
        samples: buildWhatsAppUrl(settings.whatsappNumber, en.whatsapp.samplesMessage)!,
      }
    : null;

  return (
    <>
      <a className="skip-link" href="#main">
        {en.nav.skipToContent}
      </a>
      <SiteNav />
      <main id="main">{children}</main>
      <SiteFooter contactEmail={settings.contactEmail} />
      <WhatsAppButton links={links} />
    </>
  );
}
