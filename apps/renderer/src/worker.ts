/**
 * The BullMQ worker (P1-US-601).
 *
 * One job renders one calendar: fetch the print derivatives named in the payload,
 * render sheet by sheet, merge, write the PDF back to R2. The renderer holds no
 * database connection — everything it needs arrives in the payload, so a five-minute
 * render can never pin a Postgres connection.
 *
 * Failure is the interesting path. Whatever happens, Chromium must die and the
 * memory must come back; see `docs/…/error-handling` and RQ-MEM-08.
 */
import type { Browser } from 'puppeteer-core';
import type { Holiday, Sheet } from './calendar-core.js';
import { config } from './config.js';
import { runWithTimeout } from './render/job.js';
import { createBrowserPool } from './render/launch.js';
import { renderCalendar } from './render/pipeline.js';
import type { BrowserPool } from './render/chromium.js';
import { getObjectBytes, putObject } from './storage.js';

export interface RenderJobPayload {
  readonly exportJobId: string;
  readonly sheets: readonly Sheet[];
  readonly holidays: readonly Holiday[];
  /** Slot id -> the R2 key of that photo's print derivative, plus its crop values. */
  readonly images: Readonly<
    Record<string, { key: string; panX?: number; panY?: number; zoom?: number; rotation?: number }>
  >;
  readonly cropMarks?: boolean;
  /** Where the finished PDF is written. */
  readonly outputKey: string;
}

export interface RenderJobResult {
  readonly outputKey: string;
  readonly pages: number;
  readonly bytes: number;
  readonly pageWidthMm: number;
  readonly pageHeightMm: number;
}

/**
 * Fetches every photo the job names, before Chromium launches.
 *
 * Deliberately outside the render: the page itself is offline, and doing the network
 * work first means a missing object fails the job in a second rather than after a
 * browser has been started and a minute spent.
 */
async function fetchImages(
  payload: RenderJobPayload,
): Promise<
  Record<string, { bytes: Buffer; panX?: number; panY?: number; zoom?: number; rotation?: number }>
> {
  const entries = Object.entries(payload.images);
  const images: Record<
    string,
    { bytes: Buffer; panX?: number; panY?: number; zoom?: number; rotation?: number }
  > = {};

  // Sequential, not `Promise.all`: several 5 MB derivatives resident at once is
  // exactly the kind of peak a 1 GB box cannot absorb.
  for (const [slotId, image] of entries) {
    images[slotId] = {
      bytes: await getObjectBytes(image.key),
      ...(image.panX === undefined ? {} : { panX: image.panX }),
      ...(image.panY === undefined ? {} : { panY: image.panY }),
      ...(image.zoom === undefined ? {} : { zoom: image.zoom }),
      ...(image.rotation === undefined ? {} : { rotation: image.rotation }),
    };
  }

  return images;
}

export async function processRenderJob(
  payload: RenderJobPayload,
  pool: BrowserPool<Browser>,
): Promise<RenderJobResult> {
  const images = await fetchImages(payload);

  const browser = await pool.acquire();

  try {
    const result = await runWithTimeout(
      async () =>
        renderCalendar(
          {
            sheets: payload.sheets,
            holidays: payload.holidays,
            images,
            ...(payload.cropMarks === undefined ? {} : { cropMarks: payload.cropMarks }),
          },
          browser,
          { timeoutMs: config.jobTimeoutMs },
        ),
      // RQ-MEM-08 — on a hang, kill Chromium rather than waiting for it.
      { timeoutMs: config.jobTimeoutMs, onTimeout: () => pool.kill() },
    );

    await putObject(payload.outputKey, result.pdf, 'application/pdf');

    return {
      outputKey: payload.outputKey,
      pages: result.pages,
      bytes: result.pdf.length,
      pageWidthMm: result.pageWidthMm,
      pageHeightMm: result.pageHeightMm,
    };
  } finally {
    // RQ-MEM-01 — hand the browser back on every exit route, including a throw.
    // The pool's idle timer takes it from here; it is never kept warm beyond that.
    pool.release();
  }
}

export function createRenderPool(): BrowserPool<Browser> {
  return createBrowserPool(config.jobTimeoutMs);
}
