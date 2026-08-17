import { ButtonLink } from '@buildcalendar/ui';
import { en } from '@/lib/i18n/en';
import { routes } from '@/lib/routes';

export function FinalCta() {
  return (
    <section className="final">
      <div className="wrap">
        <h2 className="display">{en.home.final.heading}</h2>
        <p className="lede final-lede">{en.home.final.lede}</p>
        <ButtonLink href={routes.newProject} variant="primary">
          {en.home.final.cta}
        </ButtonLink>
      </div>
    </section>
  );
}
