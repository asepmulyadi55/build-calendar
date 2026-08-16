/**
 * The single font allowlist (`01-tech-stack-and-infrastructure.md` §5.5).
 *
 * Two consumers must agree with this list exactly:
 *   1. the renderer Docker image, which installs the fonts at build time
 *   2. anything in the app that offers a font choice
 *
 * A font that reaches a template but is missing from the image does not fail
 * loudly — Chromium substitutes a default and the exported PDF stops matching the
 * preview. That is a WYSIWYG violation (AR-01) which a user discovers only after
 * paying, so `debianPackage` is recorded here to keep the list and the Dockerfile
 * in step. **Adding an entry here without rebuilding the renderer image is a
 * release blocker.**
 *
 * Scope note: this list is exactly what `infra/Dockerfile.renderer` installs
 * today. The display faces used by the interface — Archivo, Instrument Sans,
 * IBM Plex Mono — are deliberately absent, because they are not in the image.
 * Adding them is a Dockerfile change plus a rebuild, and belongs to whichever
 * story first authors a template that needs them.
 *
 * Phase 1 has no font picker: typography comes from the template design
 * (`design/app-editor.html`). The list still exists so template authoring and the
 * image can be validated against one source.
 */

export type FontCategory = 'sans' | 'serif' | 'mono';

export interface AllowedFont {
  /** Stable identifier stored in Design JSON. */
  readonly id: string;
  /** The family name as Chromium resolves it. */
  readonly family: string;
  /** Full CSS stack, with a generic fallback that can never silently substitute. */
  readonly cssStack: string;
  readonly category: FontCategory;
  readonly weights: readonly number[];
  /** Debian package installed by `infra/Dockerfile.renderer`. */
  readonly debianPackage: string;
}

export const FONT_ALLOWLIST: readonly AllowedFont[] = [
  {
    id: 'dejavu-sans',
    family: 'DejaVu Sans',
    cssStack: "'DejaVu Sans', sans-serif",
    category: 'sans',
    weights: [400, 700],
    debianPackage: 'fonts-dejavu-core',
  },
  {
    id: 'dejavu-serif',
    family: 'DejaVu Serif',
    cssStack: "'DejaVu Serif', serif",
    category: 'serif',
    weights: [400, 700],
    debianPackage: 'fonts-dejavu-core',
  },
  {
    id: 'dejavu-sans-mono',
    family: 'DejaVu Sans Mono',
    cssStack: "'DejaVu Sans Mono', monospace",
    category: 'mono',
    weights: [400, 700],
    debianPackage: 'fonts-dejavu-core',
  },
  {
    id: 'liberation-sans',
    family: 'Liberation Sans',
    cssStack: "'Liberation Sans', sans-serif",
    category: 'sans',
    weights: [400, 700],
    debianPackage: 'fonts-liberation',
  },
  {
    id: 'liberation-serif',
    family: 'Liberation Serif',
    cssStack: "'Liberation Serif', serif",
    category: 'serif',
    weights: [400, 700],
    debianPackage: 'fonts-liberation',
  },
  {
    id: 'liberation-mono',
    family: 'Liberation Mono',
    cssStack: "'Liberation Mono', monospace",
    category: 'mono',
    weights: [400, 700],
    debianPackage: 'fonts-liberation',
  },
] as const;

/** Proven in the P1-US-000 spike: this face rendered vector text at both A3 and A2. */
export const DEFAULT_FONT_ID = 'dejavu-sans';

export function fontById(id: string): AllowedFont {
  const font = FONT_ALLOWLIST.find((candidate) => candidate.id === id);
  if (!font) {
    throw new RangeError(
      `${id} is not on the font allowlist. Allowed: ${FONT_ALLOWLIST.map((f) => f.id).join(', ')}`,
    );
  }
  return font;
}

export function isAllowedFontFamily(family: string): boolean {
  return FONT_ALLOWLIST.some((font) => font.family === family);
}

/** Every Debian package the renderer image must install, deduplicated. */
export function requiredDebianPackages(): readonly string[] {
  return [...new Set(FONT_ALLOWLIST.map((font) => font.debianPackage))].sort();
}
