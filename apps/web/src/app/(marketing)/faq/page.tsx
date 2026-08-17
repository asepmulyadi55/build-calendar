import type { Metadata } from 'next';
import { FaqList } from '@/components/marketing/FaqList';
import { en } from '@/lib/i18n/en';

export const metadata: Metadata = {
  title: `${en.legal.faqTitle} — ${en.app.name}`,
  description: en.home.faq.heading,
  openGraph: {
    title: en.legal.faqTitle,
    description: en.home.faq.heading,
    type: 'website',
  },
};

/** The same questions as the homepage, from one source (P1-US-103). */
export default function FaqPage() {
  return (
    <>
      <header className="page-head">
        <div className="wrap">
          <span className="eyebrow">{en.home.faq.eyebrow}</span>
          <h1 className="page-title">{en.legal.faqTitle}</h1>
        </div>
      </header>

      <section className="section-flush">
        <div className="wrap faq-wrap">
          <div className="faq-side">
            <h2 className="sec-title">{en.home.faq.heading}</h2>
          </div>
          <FaqList items={en.home.faq.items} />
        </div>
      </section>
    </>
  );
}
