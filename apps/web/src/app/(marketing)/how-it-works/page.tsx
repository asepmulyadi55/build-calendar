import type { Metadata } from 'next';
import { ButtonLink } from '@buildcalendar/ui';
import { en } from '@/lib/i18n/en';
import { routes } from '@/lib/routes';

export const metadata: Metadata = {
  title: `${en.legal.howItWorksTitle} — ${en.app.name}`,
  description: en.home.how.heading,
  openGraph: {
    title: en.legal.howItWorksTitle,
    description: en.home.how.heading,
    type: 'website',
  },
};

/** The same three steps as the homepage, from one source (P1-US-103). */
export default function HowItWorksPage() {
  return (
    <>
      <header className="page-head">
        <div className="wrap">
          <span className="eyebrow">{en.home.how.eyebrow}</span>
          <h1 className="page-title">{en.home.how.heading}</h1>
        </div>
      </header>

      <section className="section-flush">
        <div className="wrap">
          <div className="grid-3">
            {en.home.how.steps.map((step) => (
              <div className="step" key={step.number}>
                <div className="n">{step.number}</div>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </div>
            ))}
          </div>

          <div className="how-cta">
            <ButtonLink href={routes.newProject} variant="primary">
              {en.home.final.cta}
            </ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}
