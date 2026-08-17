import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { Badge } from '@buildcalendar/ui';
import { requireAdmin } from '@/lib/auth/admin';
import { en } from '@/lib/i18n/en';
import { routes } from '@/lib/routes';

/**
 * The admin shell.
 *
 * `noindex` because an admin panel in a search index is an invitation (NFR-S08),
 * and never cached because everything here is live operational data.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  // The boundary. A signed-in non-admin gets 404 rather than 403 — confirming the
  // route exists tells someone probing where to keep trying.
  await requireAdmin(routes.adminTemplates);

  return (
    <>
      <nav className="nav">
        <div className="wrap nav-in">
          <Link className="brand" href={routes.adminTemplates}>
            {en.app.nameLead}
            <span>{en.app.nameTail}</span>
          </Link>
          <Badge tone="ink" className="admin-badge">
            {en.admin.badge}
          </Badge>

          <div className="nav-links">
            <Link href={routes.adminTemplates}>{en.admin.nav.templates}</Link>
          </div>

          <div className="nav-cta">
            <Link href={routes.home} className="btn btn-ghost btn-sm">
              {en.admin.userView}
            </Link>
          </div>
        </div>
      </nav>

      <main id="main">{children}</main>
    </>
  );
}
