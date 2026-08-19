/**
 * The HTML wrapper around one sheet's SVG.
 *
 * The only job here is page geometry. `@page { size: Wmm Hmm; margin: 0 }` plus
 * `page.pdf({ preferCSSPageSize: true })` is what makes the PDF's MediaBox exactly
 * trim plus bleed — the spike measured 426.13 × 600.03 mm against a 426 × 600 mm
 * target, well inside the 0.5 mm tolerance P1-US-603 sets. The residue is PDF point
 * quantisation, not a layout error.
 *
 * Nothing here may reference an external host. Fonts ship inside the renderer image
 * and resolve by family name; images arrive as `file://` paths sharp has already
 * written. An outbound request during rendering is both an SSRF surface and a source
 * of non-deterministic output.
 */

/** 72 points per inch, 25.4 mm per inch. The unit a PDF MediaBox is written in. */
export function mmToPt(mm: number): number {
  return (mm / 25.4) * 72;
}

export function pageSizeMm(sheet: { widthMm: number; heightMm: number; bleedMm: number }): {
  widthMm: number;
  heightMm: number;
} {
  // AR-04: bleed is added at export time, on every side.
  return {
    widthMm: sheet.widthMm + sheet.bleedMm * 2,
    heightMm: sheet.heightMm + sheet.bleedMm * 2,
  };
}

export interface SheetHtmlInput {
  readonly widthMm: number;
  readonly heightMm: number;
  readonly bleedMm: number;
  readonly svg: string;
}

export function buildSheetHtml(input: SheetHtmlInput): string {
  const { widthMm, heightMm } = pageSizeMm(input);

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<style>
  @page {
    size: ${widthMm}mm ${heightMm}mm;
    margin: 0;
  }
  html, body {
    margin: 0;
    padding: 0;
    width: ${widthMm}mm;
    height: ${heightMm}mm;
  }
  /* Without this Chromium drops background fills when printing, and a template
     with a coloured panel comes out white. */
  * {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  svg {
    display: block;
    width: ${widthMm}mm;
    height: ${heightMm}mm;
  }
</style>
</head>
<body>${input.svg}</body>
</html>`;
}
