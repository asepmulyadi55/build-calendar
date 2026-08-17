import type { Metadata } from 'next';
import Content from '@/content/legal/privacy.mdx';
import { en } from '@/lib/i18n/en';

export const metadata: Metadata = {
  title: `${en.legal.privacyTitle} — ${en.app.name}`,
  description: en.app.tagline,
};

/**
 * Prose lives in MDX so a policy change is a text edit, never a JSX edit
 * (P1-US-103). This wrapper supplies the page furniture and nothing else.
 */
export default function Page() {
  return (
    <>
      <header className="page-head">
        <div className="wrap">
          <span className="eyebrow">{en.footer.legal}</span>
          <h1 className="page-title">{en.legal.privacyTitle}</h1>
        </div>
      </header>
      <section className="section-flush">
        <div className="wrap legal">
          <Content />
        </div>
      </section>
    </>
  );
}
