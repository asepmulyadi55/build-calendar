import type { Metadata } from 'next';
import { Badge, Card } from '@buildcalendar/ui';
import { PricingPlans } from '@/components/marketing/PricingPlans';
import { SectionHead } from '@/components/marketing/SectionHead';
import { FaqList } from '@/components/marketing/FaqList';
import { getCatalog } from '@/lib/data/catalog';
import { formatRupiah } from '@/lib/format';
import { en } from '@/lib/i18n/en';
import { routes } from '@/lib/routes';

export const metadata: Metadata = {
  title: `${en.pricingPage.title} — ${en.app.name}`,
  description: en.pricingPage.lede,
  openGraph: {
    title: en.pricingPage.title,
    description: en.pricingPage.lede,
    type: 'website',
  },
};

export default async function PricingPage() {
  const { presets, packages } = await getCatalog();

  return (
    <>
      <header className="page-head">
        <div className="wrap">
          <span className="eyebrow">{en.pricingPage.eyebrow}</span>
          <h1 className="page-title">{en.pricingPage.title}</h1>
          <p className="lede">{en.pricingPage.lede}</p>
        </div>
      </header>

      <section className="section-tight">
        <div className="wrap">
          <SectionHead
            eyebrow={en.pricingPage.coins.eyebrow}
            heading={en.pricingPage.coins.heading}
            link={{ href: routes.faq, label: en.pricingPage.coins.link }}
          />

          <PricingPlans
            packages={packages}
            aside={{
              kicker: en.pricingPage.coins.asideKicker,
              title: en.pricingPage.coins.asideTitle,
              body: en.pricingPage.coins.asideBody,
              cta: en.pricingPage.coins.asideCta,
              href: routes.faq,
            }}
          />

          <div className="benefits">
            {en.pricingPage.benefits.map((benefit) => (
              <div className="ben" key={benefit.lead}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                  <path d="M2 7.5L5.5 11L12 3.5" stroke="currentColor" strokeWidth="1.8" />
                </svg>
                <div>
                  <b>{benefit.lead}</b>
                  {benefit.rest}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="alt">
        <div className="wrap">
          <SectionHead
            eyebrow={en.pricingPage.print.eyebrow}
            heading={en.pricingPage.print.heading}
            lede={en.pricingPage.print.lede}
            narrow
          />

          {presets.length > 0 && (
            <div className="table-scroll">
              <table className="tbl print-table">
                <thead>
                  <tr>
                    <th>{en.pricingPage.print.tableHeaders.format}</th>
                    <th>{en.pricingPage.print.tableHeaders.size}</th>
                    <th>{en.pricingPage.print.tableHeaders.sheets}</th>
                    <th>{en.pricingPage.print.tableHeaders.from}</th>
                  </tr>
                </thead>
                <tbody>
                  {presets.map((preset) => (
                    <tr key={preset.id}>
                      <td>{preset.name}</td>
                      <td className="num">
                        {preset.widthMm} × {preset.heightMm} mm
                      </td>
                      <td className="num">{preset.sheetCount}</td>
                      {/* Print pricing is admin-configured and unset until the owner
                          has a vendor quote. An em dash is honest; a made-up number
                          is not. */}
                      <td className="num">
                        {preset.printBasePrice > 0 ? formatRupiah(preset.printBasePrice) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <p className="small muted print-note">{en.pricingPage.print.note}</p>

          <Card muted className="print-phase">
            <Badge>{en.pricingPage.print.phaseBadge}</Badge>
            <p className="print-phase-body">{en.pricingPage.print.phaseNote}</p>
          </Card>
        </div>
      </section>

      <section>
        <div className="wrap faq-wrap">
          <div className="faq-side">
            <span className="eyebrow">{en.home.faq.eyebrow}</span>
            <h2 className="sec-title">{en.pricingPage.miniFaq.heading}</h2>
          </div>
          <FaqList items={en.pricingPage.miniFaq.items} />
        </div>
      </section>
    </>
  );
}
