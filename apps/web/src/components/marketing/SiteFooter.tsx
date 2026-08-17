import Link from 'next/link';
import { en, fill } from '@/lib/i18n/en';
import { routes } from '@/lib/routes';

interface SiteFooterProps {
  contactEmail: string | null;
}

/** P1-US-103 requires every legal page to be reachable from here. */
export function SiteFooter({ contactEmail }: SiteFooterProps) {
  const year = new Date().getFullYear();

  return (
    <footer>
      <div className="wrap">
        <div className="foot">
          <div>
            <div className="brand">
              {en.app.nameLead}
              <span>{en.app.nameTail}</span>
            </div>
            <p className="small muted foot-blurb">{en.app.tagline}</p>
          </div>

          <div>
            <h4>{en.footer.product}</h4>
            <ul>
              <li>
                <Link href={routes.calendarTypes}>{en.footer.links.calendarTypes}</Link>
              </li>
              <li>
                <Link href={routes.samples}>{en.footer.links.sampleDesigns}</Link>
              </li>
              <li>
                <Link href={routes.pricing}>{en.footer.links.pricing}</Link>
              </li>
              <li>
                <Link href={routes.newProject}>{en.footer.links.makeCalendar}</Link>
              </li>
            </ul>
          </div>

          <div>
            <h4>{en.footer.help}</h4>
            <ul>
              <li>
                <Link href={routes.howItWorks}>{en.footer.links.howItWorks}</Link>
              </li>
              <li>
                <Link href={routes.faq}>{en.footer.links.faq}</Link>
              </li>
              <li>
                <Link href={routes.pricing}>{en.footer.links.orderPrint}</Link>
              </li>
              {contactEmail && (
                <li>
                  <a href={`mailto:${contactEmail}`}>{en.footer.links.contact}</a>
                </li>
              )}
            </ul>
          </div>

          <div>
            <h4>{en.footer.legal}</h4>
            <ul>
              <li>
                <Link href={routes.terms}>{en.footer.links.terms}</Link>
              </li>
              <li>
                <Link href={routes.privacy}>{en.footer.links.privacy}</Link>
              </li>
              <li>
                <Link href={routes.refunds}>{en.footer.links.refunds}</Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="foot-note">
          <span>{fill(en.footer.copyright, { year })}</span>
        </div>
      </div>
    </footer>
  );
}
