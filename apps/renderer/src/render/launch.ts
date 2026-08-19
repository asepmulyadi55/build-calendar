/**
 * The real Chromium, wired to the lifecycle rules.
 *
 * Kept apart from `chromium.ts` so the lifecycle can be tested without launching a
 * browser, and so this file stays the only place that knows about Puppeteer.
 */
import puppeteer, { type Browser } from 'puppeteer-core';
import { BrowserPool, CHROMIUM_ARGS } from './chromium.js';

/** Chromium ships inside the renderer image; it is never downloaded. */
const executablePath = process.env.CHROME_PATH ?? '/usr/bin/chromium';

export function createBrowserPool(protocolTimeoutMs: number): BrowserPool<Browser> {
  return new BrowserPool<Browser>({
    launch: async () =>
      puppeteer.launch({
        executablePath,
        headless: true,
        args: [...CHROMIUM_ARGS],
        // Puppeteer's own protocol timeout must not fire before the job deadline,
        // or a slow render fails with a confusing CDP error instead of RQ-MEM-08.
        protocolTimeout: protocolTimeoutMs,
      }),
  });
}
