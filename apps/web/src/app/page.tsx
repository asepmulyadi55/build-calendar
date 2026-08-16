import { en } from '@/lib/i18n/en';

/**
 * Deliberately the only page in the app. Pages arrive with the stories that own
 * them (P1-US-101 onwards). This one exists so a clean checkout can be seen to
 * boot with the design tokens applied.
 */
export default function Page() {
  return (
    <main className="mx-auto max-w-page px-gut py-section">
      <p className="font-mono text-eyebrow uppercase tracking-eyebrow text-ink-45">{en.app.name}</p>

      <h1 className="mt-4 font-display text-page-title font-extrabold leading-flat tracking-display">
        {en.skeleton.heading}
      </h1>

      <p className="mt-6 max-w-(--container-measure) text-lede text-ink-70">{en.skeleton.body}</p>

      <a
        href="/api/health"
        className="mt-8 inline-block border-b border-rule pb-1 font-mono text-eyebrow uppercase tracking-label text-ink-45 hover:border-ink hover:text-ink"
      >
        {en.skeleton.healthLink}
      </a>
    </main>
  );
}
