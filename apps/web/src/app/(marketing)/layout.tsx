import type { ReactNode } from 'react';
import { SiteShell } from '@/components/marketing/SiteShell';

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

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return <SiteShell>{children}</SiteShell>;
}
