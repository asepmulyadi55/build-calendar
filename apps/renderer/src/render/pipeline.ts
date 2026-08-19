/**
 * The render pipeline (P1-US-601).
 *
 * Design JSON -> `calendar-core` scene -> SVG per sheet -> HTML at exact mm page
 * size -> `page.pdf()` -> single-page PDFs merged with `pdf-lib`.
 *
 * The shape of this file is dictated by memory, not by taste:
 *
 *  - One sheet is in flight at a time (RQ-MEM-02). Each finished page is written to
 *    disk and its buffer dropped, so peak memory is flat whether the calendar has
 *    one sheet or thirteen. Never build an array of page buffers.
 *  - Images are pre-sized by sharp before Chromium sees them (RQ-MEM-03).
 *  - Chromium is launched on demand and released after the last sheet (RQ-MEM-01).
 *  - Every page in Chromium is closed before the next opens; a leaked page holds a
 *    renderer process.
 */
import { mkdtemp, rm, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { PDFDocument } from 'pdf-lib';
import { renderSheetToSvg, type Holiday, type Sheet, type SheetImage } from '../calendar-core.js';
import { buildSheetHtml, pageSizeMm } from './html.js';
import { presizeForSlot } from './images.js';

/** The subset of Puppeteer this module needs, kept narrow so it can be faked. */
/**
 * Declared with method syntax on purpose: TypeScript compares method parameters
 * bivariantly, which lets Puppeteer's real `Page` satisfy this minimum without the
 * pipeline importing Puppeteer's types or the tests faking all of them.
 */
export interface RenderPage {
  setRequestInterception(enabled: boolean): Promise<void>;
  on(event: 'request', handler: (request: InterceptedRequest) => void): unknown;
  goto(url: string, options?: { waitUntil?: 'load'; timeout?: number }): Promise<unknown>;
  evaluateHandle(script: string): Promise<unknown>;
  pdf(options: {
    preferCSSPageSize: boolean;
    printBackground: boolean;
    timeout?: number;
  }): Promise<Uint8Array>;
  close(): Promise<void>;
}

export interface InterceptedRequest {
  url: () => string;
  continue: () => Promise<void> | void;
  abort: () => Promise<void> | void;
}

export interface RenderBrowser {
  newPage(): Promise<RenderPage>;
}

/** What the job hands the pipeline. Photos arrive as bytes the caller fetched. */
export interface RenderJobInput {
  readonly sheets: readonly Sheet[];
  readonly holidays: readonly Holiday[];
  /** Slot id -> the print derivative's bytes, plus the editor's crop values. */
  readonly images: Readonly<
    Record<
      string,
      { bytes: Buffer; panX?: number; panY?: number; zoom?: number; rotation?: number }
    >
  >;
  readonly cropMarks?: boolean;
}

export interface RenderResult {
  readonly pdf: Buffer;
  readonly pages: number;
  readonly pageWidthMm: number;
  readonly pageHeightMm: number;
}

/**
 * Only `file://`, `data:` and `about:` are allowed to load.
 *
 * This is the "no outbound network access during rendering" rule made mechanical.
 * It closes an SSRF path — Design JSON is user data, and a `<image href="http://…">`
 * would otherwise make the renderer fetch a URL of the user's choosing from inside
 * the production network — and it keeps output deterministic.
 */
const LOCAL_SCHEMES = ['file://', 'data:', 'about:'];

function attachOfflineGuard(page: RenderPage, blocked: string[]): void {
  page.on('request', (request) => {
    const url = request.url();
    if (LOCAL_SCHEMES.some((scheme) => url.startsWith(scheme))) {
      void request.continue();
      return;
    }
    blocked.push(url);
    void request.abort();
  });
}

/** The image slots a sheet declares, with the frame each one occupies. */
function imageSlotsOf(sheet: Sheet) {
  return sheet.objects.filter(
    (object): object is Extract<typeof object, { type: 'imageSlot' }> =>
      object.type === 'imageSlot',
  );
}

export async function renderCalendar(
  input: RenderJobInput,
  browser: RenderBrowser,
  options: { timeoutMs: number },
): Promise<RenderResult> {
  if (input.sheets.length === 0) throw new Error('nothing to render: the design has no sheets');

  const workDir = await mkdtemp(path.join(tmpdir(), 'bc-render-'));
  const blocked: string[] = [];
  const pagePaths: string[] = [];

  try {
    for (const [index, sheet] of input.sheets.entries()) {
      // 1. Pre-size this sheet's photos to exactly what their slots need at 300 DPI
      //    (RQ-MEM-03). Only this sheet's images are decoded, and they go straight
      //    to disk so Chromium reads them rather than holding them twice.
      const images: Record<string, SheetImage> = {};

      for (const slot of imageSlotsOf(sheet)) {
        const supplied = input.images[slot.slotId];
        if (!supplied) continue;

        const presized = await presizeForSlot(supplied.bytes, {
          widthMm: slot.widthMm,
          heightMm: slot.heightMm,
        });

        const filePath = path.join(workDir, `sheet-${String(index)}-${slot.slotId}.jpg`);
        await writeFile(filePath, presized.bytes);

        images[slot.slotId] = {
          href: `file://${filePath.split(path.sep).join('/')}`,
          ...(supplied.panX === undefined ? {} : { panX: supplied.panX }),
          ...(supplied.panY === undefined ? {} : { panY: supplied.panY }),
          ...(supplied.zoom === undefined ? {} : { zoom: supplied.zoom }),
          ...(supplied.rotation === undefined ? {} : { rotation: supplied.rotation }),
        };
      }

      // 2. Build the scene through calendar-core. One engine (AR-01).
      const svg = renderSheetToSvg({
        sheet,
        holidays: input.holidays,
        images,
        ...(input.cropMarks === undefined ? {} : { cropMarks: input.cropMarks }),
      });

      const html = buildSheetHtml({
        widthMm: sheet.widthMm,
        heightMm: sheet.heightMm,
        bleedMm: sheet.bleedMm,
        svg,
      });

      const htmlPath = path.join(workDir, `sheet-${String(index)}.html`);
      await writeFile(htmlPath, html, 'utf8');

      // 3. One page in Chromium, closed before the next one opens.
      const page = await browser.newPage();
      try {
        await page.setRequestInterception(true);
        attachOfflineGuard(page, blocked);

        await page.goto(`file://${htmlPath.split(path.sep).join('/')}`, {
          waitUntil: 'load',
          timeout: options.timeoutMs,
        });

        // Without this a font can still be loading when the PDF is written, and
        // the text falls back to a substitute for that one render.
        await page.evaluateHandle('document.fonts.ready');

        const bytes = await page.pdf({
          preferCSSPageSize: true,
          printBackground: true,
          timeout: options.timeoutMs,
        });

        // Straight to disk. Holding thirteen of these is exactly what RQ-MEM-02
        // forbids.
        const pdfPath = path.join(workDir, `sheet-${String(index)}.pdf`);
        await writeFile(pdfPath, bytes);
        pagePaths.push(pdfPath);
      } finally {
        await page.close();
      }
    }

    if (blocked.length > 0) {
      // Not fatal — the page rendered without it — but it means a design referenced
      // something remote, which should never reach production.
      console.warn(`[renderer] blocked ${String(blocked.length)} outbound request(s)`, {
        sample: blocked.slice(0, 3),
      });
    }

    // 4. Merge. `pdf-lib` copies page by page, so only one source document is open
    //    at a time and the merge stays proportional to a single sheet.
    const merged = await PDFDocument.create();
    for (const pdfPath of pagePaths) {
      const source = await PDFDocument.load(await readFile(pdfPath));
      const [copied] = await merged.copyPages(source, [0]);
      if (copied) merged.addPage(copied);
    }

    const output = Buffer.from(await merged.save());
    const first = input.sheets[0]!;
    const size = pageSizeMm(first);

    return {
      pdf: output,
      pages: merged.getPageCount(),
      pageWidthMm: size.widthMm,
      pageHeightMm: size.heightMm,
    };
  } finally {
    // Temporary files are the user's photos. They do not outlive the job.
    await rm(workDir, { recursive: true, force: true });
  }
}
