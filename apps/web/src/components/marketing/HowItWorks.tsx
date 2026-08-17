import { en } from '@/lib/i18n/en';
import { routes } from '@/lib/routes';
import { SectionHead } from './SectionHead';

/** Three-step how-it-works: choose template, upload photos, export or order print. */
export function HowItWorks() {
  return (
    <section id="how">
      <div className="wrap">
        <SectionHead
          eyebrow={en.home.how.eyebrow}
          heading={en.home.how.heading}
          link={{ href: routes.newProject, label: en.home.how.link }}
        />
        <div className="grid-3">
          {en.home.how.steps.map((step) => (
            <div className="step" key={step.number}>
              <div className="n">{step.number}</div>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
