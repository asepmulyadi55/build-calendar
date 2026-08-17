import { en } from '../i18n/en';
import type { ProductPresetView } from './catalog';

/**
 * `product_presets.code` → `A3 · 297×420`, the label under a sample tile.
 *
 * Built from the database so a tile can never claim a size the catalog does not
 * have. The short paper name (A3, A2) is copy and comes from `en.ts`; everything
 * numeric comes from the preset.
 */
export function presetSizeLabels(presets: ProductPresetView[]): Record<string, string> {
  const labels: Record<string, string> = {};

  for (const preset of presets) {
    const paperName = en.products[preset.code]?.paperName;
    const dimensions = `${preset.widthMm}×${preset.heightMm}`;
    labels[preset.code] = paperName ? `${paperName} · ${dimensions}` : dimensions;
  }

  return labels;
}
