/**
 * The memory regression harness (P1-US-601, RQ-MEM).
 *
 * Renders one product preset from a self-contained fixture and prints a JSON report
 * on stdout. It exists so `docker run -m 1g` can assert the heaviest page in the
 * catalogue completes inside the production memory cap, in CI, without Redis, R2 or
 * Postgres — the container runs with `--network none`.
 *
 * It is part of the shipped image on purpose. A memory test that runs against a
 * different image than production is not a memory test.
 */
import sharp from 'sharp';
import { PDFDict, PDFDocument, PDFName } from 'pdf-lib';
import { createCalendarGridObject, type Holiday, type Sheet } from '../calendar-core.js';
import { renderCalendar } from '../render/pipeline.js';
import { createBrowserPool } from '../render/launch.js';
import { runWithTimeout } from '../render/job.js';
import { config } from '../config.js';

/** The seeded presets, trim size in millimetres (`packages/db/src/seed.ts`). */
const PRESETS: Record<
  string,
  { widthMm: number; heightMm: number; bleedMm: number; sheets: number }
> = {
  'WALL-1': { widthMm: 420, heightMm: 594, bleedMm: 3, sheets: 1 },
  'WALL-12': { widthMm: 297, heightMm: 420, bleedMm: 3, sheets: 12 },
  'DESK-A5L': { widthMm: 210, heightMm: 148, bleedMm: 3, sheets: 13 },
};

const HOLIDAYS: Holiday[] = [
  { date: '2027-01-01', name: 'Tahun Baru Masehi', type: 'national', year: 2027, isRedDate: true },
  {
    date: '2027-01-08',
    name: 'Cuti Bersama Tahun Baru Imlek',
    type: 'joint_leave',
    year: 2027,
    isRedDate: true,
  },
];

function buildSheet(
  preset: { widthMm: number; heightMm: number; bleedMm: number },
  index: number,
): Sheet {
  const pageWidthMm = preset.widthMm + preset.bleedMm * 2;
  const pageHeightMm = preset.heightMm + preset.bleedMm * 2;
  const photoHeightMm = Math.round(pageHeightMm * 0.585);

  return {
    id: `sheet-${String(index + 1).padStart(2, '0')}`,
    index,
    widthMm: preset.widthMm,
    heightMm: preset.heightMm,
    bleedMm: preset.bleedMm,
    safeMarginMm: 12,
    slots: [
      {
        id: 'photo-1',
        type: 'image',
        required: true,
        xMm: 0,
        yMm: 0,
        widthMm: pageWidthMm,
        heightMm: photoHeightMm,
      },
    ],
    objects: [
      {
        type: 'imageSlot',
        id: 'img-1',
        slotId: 'photo-1',
        xMm: 0,
        yMm: 0,
        widthMm: pageWidthMm,
        heightMm: photoHeightMm,
      },
      createCalendarGridObject({
        id: 'grid-1',
        month: (index % 12) + 1,
        year: 2027,
        xMm: preset.bleedMm + 12,
        yMm: photoHeightMm + 14,
        widthMm: pageWidthMm - (preset.bleedMm + 12) * 2,
        heightMm: pageHeightMm - photoHeightMm - 28,
        showHolidayNames: true,
      }),
    ],
  };
}

/**
 * A stand-in for an R2 print derivative, generated rather than shipped so the image
 * stays small. Deliberately larger than any slot needs, so RQ-MEM-03's pre-sizing is
 * exercised rather than bypassed.
 */
async function sourcePhoto(): Promise<Buffer> {
  return sharp({
    create: { width: 6000, height: 4500, channels: 3, background: { r: 120, g: 96, b: 72 } },
  })
    .jpeg({ quality: 88 })
    .toBuffer();
}

/** Peak RSS of this process, sampled while the render runs. */
function startRssSampler(intervalMs = 100): { stop: () => number } {
  let peak = process.memoryUsage.rss();
  const timer = setInterval(() => {
    peak = Math.max(peak, process.memoryUsage.rss());
  }, intervalMs);
  timer.unref?.();

  return {
    stop: () => {
      clearInterval(timer);
      return Math.max(peak, process.memoryUsage.rss());
    },
  };
}

async function main(): Promise<void> {
  const code = process.env.RENDER_FIXTURE_PRESET ?? 'WALL-1';
  const preset = PRESETS[code];
  if (!preset) throw new Error(`unknown preset: ${code}`);

  const sheetCount = Number(process.env.RENDER_FIXTURE_SHEETS ?? preset.sheets);
  const sheets = Array.from({ length: sheetCount }, (_, index) => buildSheet(preset, index));

  const photo = await sourcePhoto();
  const pool = createBrowserPool(config.jobTimeoutMs);
  const sampler = startRssSampler();
  const started = Date.now();

  let result;
  try {
    const browser = await pool.acquire();

    result = await runWithTimeout(
      async () =>
        renderCalendar(
          { sheets, holidays: HOLIDAYS, images: { 'photo-1': { bytes: photo } }, cropMarks: true },
          browser,
          { timeoutMs: config.jobTimeoutMs },
        ),
      { timeoutMs: config.jobTimeoutMs, onTimeout: () => pool.kill() },
    );

    pool.release();
  } finally {
    // RQ-MEM-01: the harness must not leave Chromium behind, or the peak it reports
    // is not the peak production would see.
    await pool.kill();
  }

  const peakRss = sampler.stop();

  // Read the output back the way a reviewer would: page box in points, and whether
  // any text survived as text.
  const document = await PDFDocument.load(result.pdf);
  const first = document.getPage(0);
  const { width: widthPt, height: heightPt } = first.getSize();

  // Whether text survived as text.
  //
  // Scanning the content stream for `Tj` does not work: Chromium writes those
  // streams FlateDecode-compressed, so a perfectly good vector PDF looks empty.
  // The reliable signal is the page's font resources — a rasterised page has none,
  // and every embedded subset carries a six-letter tag like `AAAAAA+DejaVuSans`.
  const fonts = first.node.Resources()?.lookup(PDFName.of('Font'), PDFDict);
  const baseFonts = fonts
    ? fonts.keys().map((key) => String(fonts.lookup(key, PDFDict).get(PDFName.of('BaseFont'))))
    : [];

  // A font missing from the image is substituted silently by Chromium and the
  // defect only shows up on paper. Verified on Windows during development: without
  // DejaVu installed, the same design embeds Times New Roman instead. In the
  // container the allowlisted packages are present, so anything outside them here
  // means FONT_ALLOWLIST and the Dockerfile have drifted apart (`01-…` §5.5).
  const embeddedFonts = baseFonts.map((name) => name.replace(/^\/[A-Z]{6}\+/, ''));
  const substitutedFonts = embeddedFonts.filter((family) => !/DejaVu|Liberation/i.test(family));

  const report = {
    ok: true,
    preset: code,
    pages: document.getPageCount(),
    pageWidthMm: Math.round((widthPt / 72) * 25.4 * 100) / 100,
    pageHeightMm: Math.round((heightPt / 72) * 25.4 * 100) / 100,
    expectedWidthMm: result.pageWidthMm,
    expectedHeightMm: result.pageHeightMm,
    textObjects: baseFonts.length,
    embeddedFonts,
    substitutedFonts,
    pdfBytes: result.pdf.length,
    peakRssMb: Math.round(peakRss / 1024 / 1024),
    wallMs: Date.now() - started,
  };

  console.log(JSON.stringify(report, null, 2));
}

main().catch((error: unknown) => {
  console.error(
    JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) }),
  );
  process.exit(1);
});
