import Link from 'next/link';
import { en, fill } from '@/lib/i18n/en';
import { routes } from '@/lib/routes';
import type { ProductPresetView } from '@/lib/data/catalog';
import { SectionHead } from './SectionHead';

/**
 * The calendar formats, read from `product_presets`.
 *
 * Every number on these cards — trim size, sheet count — comes from the database,
 * so an admin editing a preset changes the homepage without a deploy. Only the
 * descriptive sentence is copy, and a preset without one still renders.
 */
export function CalendarTypes({ presets }: { presets: ProductPresetView[] }) {
  if (presets.length === 0) return null;

  return (
    <section id="types" className="alt">
      <div className="wrap">
        <SectionHead
          eyebrow={fill(en.home.types.eyebrow, { count: presets.length })}
          heading={en.home.types.heading}
          lede={en.home.types.lede}
          link={{ href: routes.samples, label: en.home.types.link }}
        />

        <div className="types">
          {presets.map((preset, index) => {
            const copy = en.products[preset.code];
            const size = `${preset.widthMm} × ${preset.heightMm} mm`;
            const sheets =
              preset.sheetCount === 1
                ? en.home.types.sheetSuffixSingular
                : en.home.types.sheetsSuffix;

            return (
              // A div, not a link: P1-US-101 asks for a "see samples" link on each
              // card, and an anchor cannot legally contain another anchor.
              <div className="type" key={preset.id}>
                <div className="mini">
                  <i style={miniShape(preset)} />
                </div>
                <div className="idx">{String(index + 1).padStart(2, '0')}</div>
                <h3>
                  <Link href={routes.newProject}>{preset.name}</Link>
                </h3>
                {copy && <p>{copy.description}</p>}
                <div className="dims">
                  <b>{copy?.paperName ? `${copy.paperName} · ${size}` : size}</b>
                  {` · ${preset.sheetCount} ${sheets}`}
                  {copy?.extra ? ` · ${copy.extra}` : ''}
                </div>
                <Link className="type-samples" href={routes.samples}>
                  {en.home.types.cardSamplesLink}
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/**
 * The little proportional rectangle above each card. Its shape is the real trim
 * ratio, scaled to fit the fixed 82px well from the design system — so the desk
 * calendar reads as landscape and the A2 as tall, without a hardcoded size per
 * product.
 */
function miniShape(preset: ProductPresetView): { width: string; height: string } {
  const MAX_EDGE_PX = 76;
  const longest = Math.max(preset.widthMm, preset.heightMm);
  const scale = MAX_EDGE_PX / longest;

  return {
    width: `${Math.round(preset.widthMm * scale)}px`,
    height: `${Math.round(preset.heightMm * scale)}px`,
  };
}
