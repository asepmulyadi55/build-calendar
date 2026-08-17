'use client';

import { useMemo, useState } from 'react';
import { ButtonLink, Modal } from '@buildcalendar/ui';
import { en, fill } from '@/lib/i18n/en';
import { routes } from '@/lib/routes';
import type { SampleDesign } from '@/lib/data/sample-designs';

interface SampleGalleryProps {
  designs: readonly SampleDesign[];
  /** `product_presets.code` → "DESK · 210×148". Looked up in the database so the
   *  sizes on a tile can never drift from the catalog. */
  sizeLabels: Record<string, string>;
  showFilters?: boolean;
}

/**
 * The sample gallery, rendered from data (P1-US-101).
 *
 * The tiles are placeholder gradients until photographs of real printed calendars
 * exist. Swapping them is a change to `sample-designs.ts` plus the one `<div>`
 * below — not a rewrite of this component.
 *
 * Laid out so three designs look deliberate rather than sparse, and so more simply
 * extend the grid.
 */
export function SampleGallery({ designs, sizeLabels, showFilters = false }: SampleGalleryProps) {
  const [category, setCategory] = useState<string | null>(null);
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const categories = useMemo(
    () => [...new Set(designs.map((design) => design.category))].sort(),
    [designs],
  );

  const visible = useMemo(
    () => (category ? designs.filter((design) => design.category === category) : designs),
    [designs, category],
  );

  const open = openIndex === null ? null : visible[openIndex];

  const step = (delta: number) => {
    if (openIndex === null || visible.length === 0) return;
    setOpenIndex((openIndex + delta + visible.length) % visible.length);
  };

  return (
    <>
      {showFilters && (
        <div className="chips gallery-chips" role="group" aria-label={en.samplesPage.filterLabel}>
          <button
            type="button"
            className={category === null ? 'chip on' : 'chip'}
            aria-pressed={category === null}
            onClick={() => setCategory(null)}
          >
            {en.samplesPage.filterAll}
          </button>
          {categories.map((name) => (
            <button
              key={name}
              type="button"
              className={category === name ? 'chip on' : 'chip'}
              aria-pressed={category === name}
              onClick={() => setCategory(name)}
            >
              {name}
            </button>
          ))}
        </div>
      )}

      {visible.length === 0 ? (
        <div className="card">
          <b className="h3">{en.samplesPage.emptyHeading}</b>
          <p className="muted small">{en.samplesPage.emptyBody}</p>
        </div>
      ) : (
        <div className="grid-4">
          {visible.map((design, index) => (
            <button
              type="button"
              className="samp samp-button"
              key={design.id}
              onClick={() => setOpenIndex(index)}
              aria-label={fill(en.samplesPage.lightbox.open, { name: design.name })}
            >
              <div className={`img ${design.swatch}`} />
              <div className="cap">
                <b>{design.name}</b>
                <span className="mono">{sizeLabels[design.productPresetCode] ?? ''}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      <Modal
        open={open !== null}
        onClose={() => setOpenIndex(null)}
        label={open ? open.name : ''}
        closeLabel={en.samplesPage.lightbox.close}
        controls={
          visible.length > 1 ? (
            <div className="row">
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => step(-1)}>
                {en.samplesPage.lightbox.previous}
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => step(1)}>
                {en.samplesPage.lightbox.next}
              </button>
            </div>
          ) : null
        }
      >
        {open && (
          <>
            <div className={`img lightbox-img ${open.swatch}`} />
            <div className="row-between lightbox-cap">
              <div>
                <b className="h3">{open.name}</b>
                <p className="mono muted">{sizeLabels[open.productPresetCode] ?? ''}</p>
              </div>
              <ButtonLink href={routes.newProject} variant="primary" size="small">
                {en.samplesPage.lightbox.useThis}
              </ButtonLink>
            </div>
          </>
        )}
      </Modal>
    </>
  );
}
