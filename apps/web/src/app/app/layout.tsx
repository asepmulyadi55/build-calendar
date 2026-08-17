import type { ReactNode } from 'react';
import Link from 'next/link';
import { getAuthContext } from '@/lib/auth/session';
import { en } from '@/lib/i18n/en';
import { routes } from '@/lib/routes';

/**
 * The signed-in app shell from `design/app-new.html`: sidebar left, content right.
 *
 * Entries whose epic has not been built yet are rendered disabled rather than
 * linking nowhere — the prototype does the same for Orders and Settings.
 *
 * Never cached: everything here depends on who is asking.
 */
export const dynamic = 'force-dynamic';

export default async function AppLayout({ children }: { children: ReactNode }) {
  const context = await getAuthContext();

  return (
    <div className="app">
      <aside className="side">
        <Link className="brand" href={routes.home}>
          {en.app.nameLead}
          <span>{en.app.nameTail}</span>
        </Link>

        <nav className="side-nav">
          <span className="is-disabled">{en.appShell.projects}</span>
          <Link href={routes.newProject} className="on">
            {en.appShell.newCalendar}
          </Link>
          <span className="is-disabled">{en.appShell.coins}</span>
          <span className="is-disabled">
            {en.appShell.orders} — {en.appShell.comingSoon}
          </span>
          <Link href={routes.account}>{en.appShell.settings}</Link>
        </nav>

        <div className="side-foot">
          <div className="coinbox">
            <span className="mono coinbox-label">{en.appShell.balance}</span>
            {/* The cache. BR-C05 makes `coin_transactions` authoritative once the
                ledger exists (Epic 5); until then there is nothing to reconcile. */}
            <div className="n">
              0 <span className="coinbox-unit">{en.appShell.coinsUnit}</span>
            </div>
          </div>

          {context.user?.role === 'admin' && (
            <Link href={routes.adminTemplates} className="small muted side-admin">
              {en.appShell.adminView}
            </Link>
          )}
        </div>
      </aside>

      <main className="main" id="main">
        {children}
      </main>
    </div>
  );
}
