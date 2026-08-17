/**
 * The sample gallery, as data (P1-US-101).
 *
 * Placeholder gradients stand in for real printed output until photographs of
 * actual printed calendars exist. Because the gallery renders from this array,
 * swapping them is a data change here — not a markup change in three components.
 *
 * To swap: replace `swatch` with an `image` key and update `SampleTile`. Nothing
 * else moves.
 *
 * `swatch` names a class in the design system (`.s1`–`.s8`), so the gradients stay
 * in CSS with every other colour rather than being duplicated as hex here.
 *
 * `productPresetCode` references `product_presets.code`. The size label shown under
 * each tile is looked up from the database, so it can never drift from the catalog.
 */
export interface SampleDesign {
  id: string;
  name: string;
  category: string;
  productPresetCode: string;
  swatch: `s${number}`;
}

export const SAMPLE_DESIGNS: readonly SampleDesign[] = [
  { id: 'warm', name: 'Warm', category: 'Family', productPresetCode: 'DESK-A5L', swatch: 's1' },
  { id: 'grove', name: 'Grove', category: 'Nature', productPresetCode: 'WALL-12', swatch: 's2' },
  { id: 'dusk', name: 'Dusk', category: 'Minimal', productPresetCode: 'WALL-12', swatch: 's3' },
  {
    id: 'classic',
    name: 'Classic',
    category: 'Business',
    productPresetCode: 'WALL-1',
    swatch: 's4',
  },
  {
    id: 'harbour',
    name: 'Harbour',
    category: 'Nature',
    productPresetCode: 'WALL-12',
    swatch: 's5',
  },
  { id: 'clay', name: 'Clay', category: 'Minimal', productPresetCode: 'DESK-A5L', swatch: 's6' },
  { id: 'stone', name: 'Stone', category: 'Business', productPresetCode: 'WALL-12', swatch: 's7' },
  { id: 'amber', name: 'Amber', category: 'Kids', productPresetCode: 'WALL-1', swatch: 's8' },
] as const;

/** Homepage shows a preview row; the gallery page shows everything. */
export const HOMEPAGE_SAMPLE_COUNT = 4;

/**
 * Filter chips, derived from the data rather than written twice. Adding a design in
 * a new category makes the chip appear on its own.
 */
export function sampleCategories(designs: readonly SampleDesign[] = SAMPLE_DESIGNS): string[] {
  return [...new Set(designs.map((design) => design.category))].sort();
}
