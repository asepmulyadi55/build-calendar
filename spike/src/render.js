// P1-US-000 spike renderer.
// One sheet -> SVG -> HTML at exact mm page size -> page.pdf({ preferCSSPageSize: true }).
// Chromium is launched on demand and killed when the sheet is done (RQ-MEM-01).

import { mkdirSync, writeFileSync, statSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import sharp from 'sharp';
import puppeteer from 'puppeteer-core';

import { PRESETS, pageSize, photoSlotPx, buildSheetHtml } from './sheet.js';
import { startSampler, mb, currentBytes } from './mem.js';

// Must be set before the first sharp operation, not after. libvips otherwise keeps an
// operation cache whose native allocations never return to the OS between jobs.
sharp.cache(false);
sharp.concurrency(1);

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, '..');
const OUT = path.join(ROOT, 'out');
const TMP = path.join(ROOT, '.tmp');
const FIXTURE = path.join(ROOT, 'fixtures', 'source.jpg');

const YEAR = 2027;
const MONTH = 1; // Januari

const CHROME = process.env.CHROME_PATH || '/usr/bin/chromium';

// RQ-MEM-07
const CHROMIUM_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-gpu',
  '--headless=new',
  '--js-flags=--max-old-space-size=256',
  '--font-render-hinting=none',
];
if (process.env.SINGLE_PROCESS === '1') CHROMIUM_ARGS.push('--single-process');

async function renderOne(presetId) {
  const preset = PRESETS[presetId];
  if (!preset) throw new Error(`unknown preset: ${presetId}`);

  const { w: pageW, h: pageH } = pageSize(preset);
  const slot = photoSlotPx(preset);

  mkdirSync(OUT, { recursive: true });
  mkdirSync(TMP, { recursive: true });

  const sampler = startSampler(100);
  const started = Date.now();
  const baselineBytes = currentBytes();

  // 1. Pre-size the image to exactly the pixels the slot needs at 300 DPI (RQ-MEM-03).
  const photoPath = path.join(TMP, `photo-${presetId}.jpg`);
  const sharpStart = Date.now();
  await sharp(FIXTURE)
    .resize(slot.width, slot.height, { fit: 'cover', kernel: 'lanczos3' })
    .jpeg({ quality: 88 })
    .toFile(photoPath);
  const sharpMs = Date.now() - sharpStart;
  sampler.mark();
  const afterSharpBytes = currentBytes();

  // 2. Build the page. file:// only; nothing is fetched over the network.
  const html = buildSheetHtml({
    preset,
    year: YEAR,
    month: MONTH,
    photoHref: `file://${photoPath}`,
  });
  const htmlPath = path.join(TMP, `sheet-${presetId}.html`);
  writeFileSync(htmlPath, html, 'utf8');

  // 3. Launch Chromium on demand.
  const launchStart = Date.now();
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: CHROMIUM_ARGS,
    protocolTimeout: 300000, // RQ-MEM-08 job budget is 5 min
  });
  const launchMs = Date.now() - launchStart;
  sampler.mark();

  let pdfPath;
  try {
    const page = await browser.newPage();

    // No outbound network access during rendering (P1-US-601).
    await page.setRequestInterception(true);
    const blocked = [];
    page.on('request', (req) => {
      const url = req.url();
      if (url.startsWith('file://') || url.startsWith('data:') || url.startsWith('about:')) {
        req.continue();
      } else {
        blocked.push(url);
        req.abort();
      }
    });

    await page.goto(`file://${htmlPath}`, { waitUntil: 'load', timeout: 120000 });
    await page.evaluateHandle('document.fonts.ready');
    sampler.mark();

    const pdfStart = Date.now();
    const buffer = await page.pdf({
      preferCSSPageSize: true,
      printBackground: true,
      timeout: 300000,
    });
    const pdfMs = Date.now() - pdfStart;
    sampler.mark();

    pdfPath = path.join(OUT, `${presetId}-${pageW}x${pageH}mm.pdf`);
    writeFileSync(pdfPath, buffer);

    await page.close();

    if (blocked.length) console.warn(`blocked ${blocked.length} non-file request(s)`);

    const peak = sampler.stop();
    const result = {
      preset: presetId,
      label: preset.label,
      pageMm: { w: pageW, h: pageH },
      trimMm: { w: preset.trimW, h: preset.trimH },
      bleedMm: preset.bleed,
      photoSlot: slot,
      photoBytes: statSync(photoPath).size,
      pdfPath,
      pdfBytes: buffer.length,
      timingMs: { sharp: sharpMs, chromiumLaunch: launchMs, pdf: pdfMs, total: Date.now() - started },
      memoryMb: {
        baseline: mb(baselineBytes),
        afterSharp: mb(afterSharpBytes),
        sampledPeak: mb(peak.sampledPeakBytes),
        kernelPeak: mb(peak.kernelPeakBytes),
        // Separates "the Node worker is growing" from "the container is holding page cache".
        nodeRss: mb(process.memoryUsage().rss),
        nodeHeapUsed: mb(process.memoryUsage().heapUsed),
        nodeExternal: mb(process.memoryUsage().external),
      },
      chromiumArgs: CHROMIUM_ARGS,
    };
    return result;
  } finally {
    // Never keep a warm browser (RQ-MEM-01).
    await browser.close();
    try {
      rmSync(TMP, { recursive: true, force: true });
    } catch {}
  }
}

async function main() {
  const arg = (process.argv[2] || 'all').toLowerCase();
  const ids = arg === 'all' ? ['a3', 'a2'] : [arg];
  // Repeating the job also shows whether killing Chromium really discards the
  // previous job's memory (RQ-MEM-01), and gives `docker stats` enough wall time
  // to take a useful number of samples.
  const repeat = Math.max(1, Number(process.env.REPEAT || 1));

  const results = [];
  for (const id of ids) {
    let r;
    for (let i = 0; i < repeat; i++) {
      r = await renderOne(id);
      if (repeat > 1) {
        console.log(
          `  run ${i + 1}/${repeat}  container ${r.memoryMb.baseline}->${r.memoryMb.sampledPeak}MB  ` +
            `kernel peak ${r.memoryMb.kernelPeak}MB  ` +
            `node rss ${r.memoryMb.nodeRss}MB (heap ${r.memoryMb.nodeHeapUsed}MB, ext ${r.memoryMb.nodeExternal}MB)  ` +
            `${r.timingMs.total}ms`,
        );
      }
    }
    results.push(r);
    console.log(`\n=== ${id.toUpperCase()} ===`);
    console.log(`page          ${r.pageMm.w} x ${r.pageMm.h} mm`);
    console.log(`photo slot    ${r.photoSlot.width} x ${r.photoSlot.height} px @300dpi`);
    console.log(`pdf           ${r.pdfPath} (${Math.round(r.pdfBytes / 1024)} KB)`);
    console.log(
      `timing        sharp ${r.timingMs.sharp}ms, launch ${r.timingMs.chromiumLaunch}ms, pdf ${r.timingMs.pdf}ms, total ${r.timingMs.total}ms`,
    );
    console.log(
      `container mem baseline ${r.memoryMb.baseline}MB -> peak ${r.memoryMb.sampledPeak}MB (kernel peak ${r.memoryMb.kernelPeak}MB)`,
    );
  }

  mkdirSync(OUT, { recursive: true });
  writeFileSync(path.join(OUT, `render-${ids.join('-')}.json`), JSON.stringify(results, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
