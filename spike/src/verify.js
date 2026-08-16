// Answers question 1 with numbers: exact page size, and whether the text is real
// vector text (extractable/selectable) rather than pixels baked into the photo.

import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { PDFDocument, PDFName } from 'pdf-lib';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, '..');
const OUT = path.join(ROOT, 'out');

const PT_TO_MM = 25.4 / 72;
const TOLERANCE_MM = 0.5; // P1-US-603
const round2 = (n) => Math.round(n * 100) / 100;

// What must be present, in Bahasa Indonesia, on the printed sheet.
const REQUIRED_STRINGS = [
  'Januari',
  '2027',
  'Sen',
  'Sel',
  'Rab',
  'Kam',
  'Jum',
  'Sab',
  'Min',
  'Tahun Baru Masehi',
];

// Raster images that survived into the PDF, with the pixel dimensions they were
// embedded at. This is how we prove the photo kept its resolution and the text did not
// become part of it.
function imageXObjects(page, doc) {
  const found = [];
  const xobjects = page.node.Resources()?.lookup(PDFName.of('XObject'));
  if (!xobjects?.entries) return found;

  for (const [key, ref] of xobjects.entries()) {
    const stream = doc.context.lookup(ref);
    const dict = stream?.dict ?? stream;
    if (!dict?.get) continue;
    if (String(dict.get(PDFName.of('Subtype'))) !== '/Image') continue;
    found.push({
      name: String(key).replace(/^\//, ''),
      width: dict.get(PDFName.of('Width'))?.asNumber?.() ?? null,
      height: dict.get(PDFName.of('Height'))?.asNumber?.() ?? null,
      filter: String(dict.get(PDFName.of('Filter')) ?? '').replace(/^\//, ''),
    });
  }
  return found;
}

async function inspect(file) {
  const bytes = readFileSync(file);

  // Page geometry straight from the MediaBox.
  const doc = await PDFDocument.load(bytes, { updateMetadata: false });
  const images = doc.getPages().flatMap((p) => imageXObjects(p, doc));
  const sizes = doc.getPages().map((p) => {
    const { width, height } = p.getSize();
    return {
      widthPt: round2(width),
      heightPt: round2(height),
      widthMm: round2(width * PT_TO_MM),
      heightMm: round2(height * PT_TO_MM),
    };
  });

  // Text extraction. If a viewer can extract it, a viewer can select it.
  const pdf = await pdfjs.getDocument({
    data: new Uint8Array(bytes),
    useSystemFonts: false,
    isEvalSupported: false,
  }).promise;

  const texts = [];
  const fonts = new Set();
  let imageDraws = 0;

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);

    const content = await page.getTextContent();
    for (const item of content.items) {
      if (typeof item.str === 'string' && item.str.trim()) texts.push(item.str.trim());
      if (item.fontName) fonts.add(item.fontName);
    }

    const ops = await page.getOperatorList();
    for (const fn of ops.fnArray) {
      if (fn === pdfjs.OPS.paintImageXObject || fn === pdfjs.OPS.paintJpegXObject) imageDraws++;
    }

    page.cleanup();
  }

  const joined = texts.join(' ');
  await pdf.destroy();

  return {
    file: path.basename(file),
    pageCount: sizes.length,
    sizes,
    textItemCount: texts.length,
    textSelectable: texts.length > 0,
    imageDraws,
    images: images.map((img) => ({
      ...img,
      // The photo is placed across the full page width, so this is its effective print DPI.
      effectiveDpiAcrossPageWidth:
        img.width && sizes[0] ? Math.round(img.width / (sizes[0].widthMm / 25.4)) : null,
    })),
    fontsUsed: [...fonts],
    missingStrings: REQUIRED_STRINGS.filter((s) => !joined.includes(s)),
    sampleText: texts.slice(0, 24),
  };
}

function expectedFor(name) {
  const m = name.match(/(\d+)x(\d+)mm/);
  return m ? { w: Number(m[1]), h: Number(m[2]) } : null;
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const files = readdirSync(OUT)
    .filter((f) => f.toLowerCase().endsWith('.pdf'))
    .sort();

  if (!files.length) {
    console.error(`no PDFs in ${OUT} — run the render first`);
    process.exit(1);
  }

  const report = [];
  for (const f of files) {
    const r = await inspect(path.join(OUT, f));
    const expected = expectedFor(f);
    if (expected) {
      const s = r.sizes[0];
      r.expectedMm = expected;
      r.sizeDeltaMm = { w: round2(s.widthMm - expected.w), h: round2(s.heightMm - expected.h) };
      r.sizeWithinTolerance =
        Math.abs(r.sizeDeltaMm.w) <= TOLERANCE_MM && Math.abs(r.sizeDeltaMm.h) <= TOLERANCE_MM;
    }
    report.push(r);

    const s = r.sizes[0];
    console.log(`\n=== ${r.file} ===`);
    console.log(`pages          ${r.pageCount}`);
    console.log(`page size      ${s.widthPt} x ${s.heightPt} pt = ${s.widthMm} x ${s.heightMm} mm`);
    if (expected) {
      console.log(
        `expected       ${expected.w} x ${expected.h} mm (delta ${r.sizeDeltaMm.w} / ${r.sizeDeltaMm.h} mm, within ${TOLERANCE_MM}mm: ${r.sizeWithinTolerance})`,
      );
    }
    console.log(`text objects   ${r.textItemCount} -> selectable: ${r.textSelectable}`);
    console.log(
      `raster images  ${r.imageDraws} draw(s): ${
        r.images
          .map(
            (i) =>
              `${i.width}x${i.height}px ${i.filter} (~${i.effectiveDpiAcrossPageWidth} dpi at page width)`,
          )
          .join(', ') || '(none)'
      }`,
    );
    console.log(`fonts used     ${r.fontsUsed.join(', ') || '(none)'}`);
    console.log(
      `required text  ${r.missingStrings.length === 0 ? 'all present' : 'MISSING: ' + r.missingStrings.join(', ')}`,
    );
    console.log(`sample         ${r.sampleText.slice(0, 14).join(' | ')}`);
  }

  writeFileSync(path.join(OUT, 'verify.json'), JSON.stringify(report, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
