import type { ReactNode } from 'react';
import Link from 'next/link';
import { CalendarMockup } from '@/components/marketing/CalendarMockup';
import { en } from '@/lib/i18n/en';
import { routes } from '@/lib/routes';

/**
 * The split auth layout from `design/signin.html`: form on the left, a printed
 * sheet on the right. The art collapses away below 880px so the form gets the
 * whole screen — most Indonesian traffic is mobile, and this is the path to a
 * paying account.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="auth">
      <div className="auth-pane">
        <Link className="brand auth-brand" href={routes.home}>
          {en.app.nameLead}
          <span>{en.app.nameTail}</span>
        </Link>
        {children}
      </div>

      <div className="auth-art">
        <div className="auth-art-sheet">
          <CalendarMockup />
        </div>
      </div>
    </div>
  );
}
