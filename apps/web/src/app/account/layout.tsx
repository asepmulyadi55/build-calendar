import type { ReactNode } from 'react';
import { SiteShell } from '@/components/marketing/SiteShell';

/**
 * Signed-in pages get the same chrome as the public ones for now: navigation,
 * footer, and the floating WhatsApp button P1-US-104 requires on authenticated
 * pages too. The dedicated app shell from `design/app.html` arrives with Epic 3,
 * which is the first epic that has a sidebar worth showing.
 *
 * Never cached: this page reads the signed-in user.
 */
export const dynamic = 'force-dynamic';

export default function AccountLayout({ children }: { children: ReactNode }) {
  return <SiteShell>{children}</SiteShell>;
}
