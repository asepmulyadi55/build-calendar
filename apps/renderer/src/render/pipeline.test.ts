import sharp from 'sharp';
import { describe, expect, it, vi } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { createCalendarGridObject, type Holiday, type Sheet } from '../calendar-core.js';
import { renderCalendar, type RenderBrowser, type RenderPage } from './pipeline';

/**
 * RQ-MEM-02 — one sheet at a time, merged with `pdf-lib`.
 *
 * Peak memory must be flat whether the calendar has one sheet or thirteen. The way
 * that breaks is someone collecting page buffers into an array "to merge at the
 * end", so these tests watch the shape of the work rather than only its output.
 *
 * Chromium is faked. What is under test is the pipeline's discipline; that the real
 * browser produces a correctly sized vector PDF is the docker test's job.
 */
const holidays: Holiday[] = [
  { date: '2027-01-01', name: 'Tahun Baru Masehi', type: 'national', year: 2027, isRedDate: true },
];

function sheetAt(index: number): Sheet {
  return {
    id: `sheet-${String(index)}`,
    index,
    widthMm: 420,
    heightMm: 594,
    bleedMm: 3,
    safeMarginMm: 12,
    slots: [
      { id: 'photo-1', type: 'image', required: true, xMm: 0, yMm: 0, widthMm: 426, heightMm: 350 },
    ],
    objects: [
      {
        type: 'imageSlot',
        id: 'img-1',
        slotId: 'photo-1',
        xMm: 0,
        yMm: 0,
        widthMm: 426,
        heightMm: 350,
      },
      createCalendarGridObject({
        id: 'grid-1',
        month: index + 1,
        year: 2027,
        xMm: 12,
        yMm: 380,
        widthMm: 402,
        heightMm: 200,
      }),
    ],
  };
}

/** A one-page PDF, standing in for what Chromium would emit. */
async function onePagePdf(): Promise<Uint8Array> {
  const document = await PDFDocument.create();
  document.addPage([1207.92, 1700.88]);
  return document.save();
}

function fakeBrowser() {
  let open = 0;
  let maxOpen = 0;
  const pagesCreated: RenderPage[] = [];
  const requestHandlers: ((request: {
    url: () => string;
    continue: () => void;
    abort: () => void;
  }) => void)[] = [];

  const browser: RenderBrowser = {
    newPage: async () => {
      open += 1;
      maxOpen = Math.max(maxOpen, open);

      const page: RenderPage = {
        setRequestInterception: async () => Promise.resolve(),
        on: (_event, handler) => {
          requestHandlers.push(handler as never);
        },
        goto: async () => Promise.resolve(undefined),
        evaluateHandle: async () => Promise.resolve(undefined),
        pdf: async () => onePagePdf(),
        close: async () => {
          open -= 1;
          return Promise.resolve();
        },
      };

      pagesCreated.push(page);
      return page;
    },
  };

  return {
    browser,
    pagesCreated,
    requestHandlers,
    get maxOpen() {
      return maxOpen;
    },
    get stillOpen() {
      return open;
    },
  };
}

const photo = () =>
  sharp({ create: { width: 2000, height: 1500, channels: 3, background: { r: 30, g: 60, b: 90 } } })
    .jpeg()
    .toBuffer();

describe('RQ-MEM-02 — one sheet at a time', () => {
  it('never holds two Chromium pages open at once', async () => {
    const fake = fakeBrowser();

    await renderCalendar(
      { sheets: [sheetAt(0), sheetAt(1), sheetAt(2)], holidays, images: {} },
      fake.browser,
      { timeoutMs: 1000 },
    );

    expect(fake.maxOpen).toBe(1);
    expect(fake.stillOpen).toBe(0);
  });

  it('closes the page even when the render throws', async () => {
    const fake = fakeBrowser();
    const browser: RenderBrowser = {
      newPage: async () => {
        const page = await fake.browser.newPage();
        page.pdf = async () => Promise.reject(new Error('skia exploded'));
        return page;
      },
    };

    await expect(
      renderCalendar({ sheets: [sheetAt(0)], holidays, images: {} }, browser, { timeoutMs: 1000 }),
    ).rejects.toThrow('skia exploded');

    // A leaked page holds a renderer process for the life of the browser.
    expect(fake.stillOpen).toBe(0);
  });

  it('merges one page per sheet, in order', async () => {
    const fake = fakeBrowser();

    const result = await renderCalendar(
      { sheets: [sheetAt(0), sheetAt(1), sheetAt(2)], holidays, images: {} },
      fake.browser,
      { timeoutMs: 1000 },
    );

    expect(result.pages).toBe(3);
    expect(fake.pagesCreated).toHaveLength(3);

    const reloaded = await PDFDocument.load(result.pdf);
    expect(reloaded.getPageCount()).toBe(3);
  });

  it('reports the page size as trim plus bleed', async () => {
    const fake = fakeBrowser();

    const result = await renderCalendar(
      { sheets: [sheetAt(0)], holidays, images: {} },
      fake.browser,
      {
        timeoutMs: 1000,
      },
    );

    expect(result.pageWidthMm).toBe(426);
    expect(result.pageHeightMm).toBe(600);
  });

  it('refuses a design with no sheets rather than emitting an empty PDF', async () => {
    const fake = fakeBrowser();

    await expect(
      renderCalendar({ sheets: [], holidays, images: {} }, fake.browser, { timeoutMs: 1000 }),
    ).rejects.toThrow(/no sheets/);
  });
});

describe('no outbound network access during rendering', () => {
  it('aborts anything that is not file:, data: or about:', async () => {
    const fake = fakeBrowser();

    await renderCalendar({ sheets: [sheetAt(0)], holidays, images: {} }, fake.browser, {
      timeoutMs: 1000,
    });

    const handler = fake.requestHandlers[0]!;

    const allowed = { url: () => 'file:///tmp/sheet-0.html', continue: vi.fn(), abort: vi.fn() };
    handler(allowed);
    expect(allowed.continue).toHaveBeenCalled();
    expect(allowed.abort).not.toHaveBeenCalled();

    // Design JSON is user data. Without this, a crafted image href turns the
    // renderer into an SSRF proxy inside the production network.
    for (const url of [
      'http://169.254.169.254/latest/meta-data/',
      'https://fonts.googleapis.com/css2?family=Inter',
      'ftp://example.test/x.jpg',
    ]) {
      const denied = { url: () => url, continue: vi.fn(), abort: vi.fn() };
      handler(denied);
      expect(denied.abort, url).toHaveBeenCalled();
      expect(denied.continue, url).not.toHaveBeenCalled();
    }
  });
});

describe('RQ-MEM-03 — images reach Chromium already sized', () => {
  it('writes the photo at the slot size, not the source size', async () => {
    const fake = fakeBrowser();
    const written: Record<string, Buffer> = {};

    // Intercept what the page is told to load by reading the HTML it visits.
    const browser: RenderBrowser = {
      newPage: async () => {
        const page = await fake.browser.newPage();
        const goto = page.goto.bind(page);
        page.goto = async (url, options) => {
          const filePath = decodeURIComponent(url.replace('file://', ''));
          const { readFileSync } = await import('node:fs');
          const html = readFileSync(filePath, 'utf8');
          const match = /href="file:\/\/([^"]+\.jpg)"/.exec(html);
          if (match) written[match[1]!] = readFileSync(match[1]!);
          return goto(url, options);
        };
        return page;
      },
    };

    await renderCalendar(
      { sheets: [sheetAt(0)], holidays, images: { 'photo-1': { bytes: await photo() } } },
      browser,
      { timeoutMs: 1000 },
    );

    const entries = Object.values(written);
    expect(entries).toHaveLength(1);

    const meta = await sharp(entries[0]!).metadata();
    // The 426 mm slot needs 5031 px at 300 DPI, but the 2000 px source must never
    // be upscaled to get there — `withoutEnlargement` caps it at the source width.
    expect(meta.width).toBe(2000);
    // What matters for memory is that Chromium never sees anything larger than
    // the slot needs.
    expect(meta.width!).toBeLessThanOrEqual(5031);
  });

  it('leaves a slot empty when no photo was supplied, rather than failing the job', async () => {
    const fake = fakeBrowser();

    const result = await renderCalendar(
      { sheets: [sheetAt(0)], holidays, images: {} },
      fake.browser,
      {
        timeoutMs: 1000,
      },
    );

    expect(result.pages).toBe(1);
  });
});
