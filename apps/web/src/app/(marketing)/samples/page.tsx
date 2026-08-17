import type { Metadata } from 'next';
import { ButtonLink } from '@buildcalendar/ui';
import { SampleGallery } from '@/components/marketing/SampleGallery';
import { getProductPresets } from '@/lib/data/catalog';
import { presetSizeLabels } from '@/lib/data/size-labels';
import { SAMPLE_DESIGNS } from '@/lib/data/sample-designs';
import { en } from '@/lib/i18n/en';
import { routes } from '@/lib/routes';

export const metadata: Metadata = {
  title: `${en.samplesPage.title} — ${en.app.name}`,
  description: en.samplesPage.lede,
  openGraph: {
    title: en.samplesPage.title,
    description: en.samplesPage.lede,
    type: 'website',
  },
};

export default async function SamplesPage() {
  const presets = await getProductPresets();
  const sizeLabels = presetSizeLabels(presets);

  return (
    <>
      <header className="page-head">
        <div className="wrap">
          <span className="eyebrow">{en.samplesPage.eyebrow}</span>
          <h1 className="page-title">{en.samplesPage.title}</h1>
          <p className="lede">{en.samplesPage.lede}</p>
        </div>
      </header>

      <section className="section-flush">
        <div className="wrap">
          <SampleGallery designs={SAMPLE_DESIGNS} sizeLabels={sizeLabels} showFilters />

          <div className="card gallery-cta">
            <div>
              <b className="h3">{en.samplesPage.ctaHeading}</b>
              <p className="muted small">{en.samplesPage.ctaBody}</p>
            </div>
            <ButtonLink href={routes.newProject} variant="dark">
              {en.samplesPage.ctaButton}
            </ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}
