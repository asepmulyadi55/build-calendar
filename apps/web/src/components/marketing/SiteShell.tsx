import type { ReactNode } from 'react';
import { SiteNav } from './SiteNav';
import { SiteFooter } from './SiteFooter';
import { WhatsAppButton } from './WhatsAppButton';
import { getSiteSettings } from '@/lib/data/settings';
import { buildWhatsAppUrl } from '@/lib/whatsapp';
import { en } from '@/lib/i18n/en';

/**
 * Navigation, footer and the floating WhatsApp button.
 *
 * Shared by the marketing pages and the signed-in pages, because P1-US-104 puts
 * the button on **all public and authenticated pages** — an account holder with a
 * question is the person most worth answering.
 *
 * The number is resolved once here, server-side, so the browser only ever receives
 * finished links and no page has to think about it.
 */
export async function SiteShell({ children }: { children: ReactNode }) {
  const settings = await getSiteSettings();

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
