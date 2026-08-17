import type { Metadata } from 'next';
import { ButtonLink } from '@buildcalendar/ui';
import { CalendarMockup } from '@/components/marketing/CalendarMockup';
import { CalendarTypes } from '@/components/marketing/CalendarTypes';
import { CoinBand } from '@/components/marketing/CoinBand';
import { FaqList } from '@/components/marketing/FaqList';
import { FinalCta } from '@/components/marketing/FinalCta';
import { HowItWorks } from '@/components/marketing/HowItWorks';
import { PricingPlans } from '@/components/marketing/PricingPlans';
import { SampleGallery } from '@/components/marketing/SampleGallery';
import { SectionHead } from '@/components/marketing/SectionHead';
import { getCatalog } from '@/lib/data/catalog';
import { presetSizeLabels } from '@/lib/data/size-labels';
import { HOMEPAGE_SAMPLE_COUNT, SAMPLE_DESIGNS } from '@/lib/data/sample-designs';
import { en } from '@/lib/i18n/en';
import { routes } from '@/lib/routes';

export const metadata: Metadata = {
  title: `${en.app.name} — ${en.app.tagline}`,
  description: en.app.description,
  openGraph: {
    title: en.app.name,
    description: en.app.description,
    type: 'website',
  },
};

export default async function HomePage() {
  const { presets, packages } = await getCatalog();
  const sizeLabels = presetSizeLabels(presets);
  const cheapest = packages[0] ?? null;

  return (
    <>
      <header className="hero">
        <div className="wrap hero-grid">
          <div>
            <p className="eyebrow">{en.home.hero.eyebrow}</p>
            <h1 className="display">
              {en.home.hero.headingLine1}
              <br />
              {en.home.hero.headingLine2} <em>{en.home.hero.headingEmphasis}</em>.
            </h1>
            <p className="lede">{en.home.hero.lede}</p>

            <div className="hero-actions">
              <ButtonLink href={routes.newProject} variant="primary">
                {en.home.hero.primaryCta}
              </ButtonLink>
              <ButtonLink href={routes.samples} variant="ghost">
                {en.home.hero.secondaryCta}
              </ButtonLink>
            </div>

            {/* A block, not a flex row: it is one sentence with a bold lead-in and a
                rule down its side. Flex would split it into columns. */}
            <p className="promise">
              <b>{en.home.hero.promiseLead}</b>
              {en.home.hero.promiseRest}
            </p>
          </div>

          <CalendarMockup />
        </div>
      </header>

      <CalendarTypes presets={presets} />

      <HowItWorks />

      <section id="samples" className="alt">
        <div className="wrap">
          <SectionHead
            eyebrow={en.home.samples.eyebrow}
            heading={en.home.samples.heading}
            lede={en.home.samples.lede}
            link={{ href: routes.samples, label: en.home.samples.link }}
          />
          <SampleGallery
            designs={SAMPLE_DESIGNS.slice(0, HOMEPAGE_SAMPLE_COUNT)}
            sizeLabels={sizeLabels}
          />
        </div>
      </section>

      <CoinBand perCalendar={cheapest?.perCalendar ?? null} />

      <section id="pricing">
        <div className="wrap">
          <SectionHead
            eyebrow={en.home.pricing.eyebrow}
            heading={en.home.pricing.heading}
            lede={en.home.pricing.lede}
            link={{ href: routes.pricing, label: en.home.pricing.link }}
          />
          <PricingPlans
            packages={packages}
            aside={{
              kicker: en.pricingPage.coins.asideKicker,
              title: en.pricingPage.coins.asideTitle,
              body: en.pricingPage.coins.asideBody,
              cta: en.pricingPage.coins.asideCta,
              href: routes.pricing,
            }}
          />
        </div>
      </section>

      <section id="faq" className="alt">
        <div className="wrap faq-wrap">
          <div className="faq-side">
            <span className="eyebrow">{en.home.faq.eyebrow}</span>
            <h2 className="sec-title">{en.home.faq.heading}</h2>
          </div>
          <FaqList items={en.home.faq.items} />
        </div>
      </section>

      <FinalCta />
    </>
  );
}
