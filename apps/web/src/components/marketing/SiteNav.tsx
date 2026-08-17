import Link from 'next/link';
import { ButtonLink } from '@buildcalendar/ui';
import { en } from '@/lib/i18n/en';
import { routes } from '@/lib/routes';

/**
 * The marketing navigation.
 *
 * The mobile menu is the prototype's CSS-only checkbox toggle, so this page ships
 * no JavaScript for navigation at all — which is most of why the homepage can hold
 * a Lighthouse score on a mid-range Android phone.
 */
export function SiteNav() {
  return (
    <nav className="nav">
      <div className="wrap nav-in">
        <input type="checkbox" id="nav-toggle" className="nav-toggle" hidden />

        <Link className="brand" href={routes.home}>
          {en.app.nameLead}
          <span>{en.app.nameTail}</span>
        </Link>

        <div className="nav-links">
          <Link href={routes.calendarTypes}>{en.nav.calendarTypes}</Link>
          <Link href={routes.samples}>{en.nav.samples}</Link>
          <Link href={routes.howItWorks}>{en.nav.howItWorks}</Link>
          <Link href={routes.pricing}>{en.nav.pricing}</Link>
          <Link href={routes.faq}>{en.nav.faq}</Link>
          <Link href={routes.signIn} className="nav-signin">
            {en.nav.signIn}
          </Link>
        </div>

        <div className="nav-cta">
          <ButtonLink
            href={routes.signIn}
            variant="ghost"
            size="small"
            className="nav-signin-desktop"
          >
            {en.nav.signIn}
          </ButtonLink>
          <ButtonLink href={routes.newProject} variant="primary" size="small">
            {en.nav.makeCalendar}
          </ButtonLink>
        </div>

        <label htmlFor="nav-toggle" className="burger" aria-label={en.nav.menu}>
          <span />
          <span />
          <span />
        </label>
      </div>
    </nav>
  );
}
