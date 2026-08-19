import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { slotPixelsAt300Dpi, presizeForSlot } from './images';

/**
 * RQ-MEM-03 — images are pre-sized with sharp to exactly the pixels the slot needs
 * at 300 DPI, before Chromium ever sees them.
 *
 * The spike measured the difference as 48 MB against 7 MB per image. Chromium
 * decodes whatever it is handed; handing it a 6000 px source for a slot that prints
 * at 1500 px is how a 1 GB box dies.
 */
describe('slotPixelsAt300Dpi', () => {
  it('converts millimetres to pixels at 300 DPI', () => {
    // The A2 full-bleed slot the spike measured: 426 mm across is 5031 px.
    expect(slotPixelsAt300Dpi(426).px).toBe(5031);
    // A3: 303 mm is 3579 px.
    expect(slotPixelsAt300Dpi(303).px).toBe(3579);
  });

  it('refuses a slot with no width rather than producing a zero-pixel image', () => {
    expect(() => slotPixelsAt300Dpi(0)).toThrow(/width/i);
  });
});

describe('presizeForSlot', () => {
  const source = () =>
    sharp({
      create: { width: 4000, height: 3000, channels: 3, background: { r: 90, g: 120, b: 160 } },
    })
      .jpeg()
      .toBuffer();

  it('produces exactly the pixels the slot needs, not the source resolution', async () => {
    const result = await presizeForSlot(await source(), { widthMm: 100, heightMm: 80 });
    const meta = await sharp(result.bytes).metadata();

    // 100 mm at 300 DPI is 1181 px; the 4000 px source must not survive.
    expect(meta.width).toBe(1181);
    expect(meta.height).toBe(945);
    expect(result.widthPx).toBe(1181);
  });

  it('covers the slot, so a differently-shaped photo fills it rather than letterboxing', async () => {
    const result = await presizeForSlot(await source(), { widthMm: 50, heightMm: 200 });
    const meta = await sharp(result.bytes).metadata();

    expect(meta.width).toBe(591);
    expect(meta.height).toBe(2362);
  });

  it('never enlarges past the source — upscaling costs memory and invents nothing', async () => {
    const small = await sharp({
      create: { width: 300, height: 300, channels: 3, background: { r: 0, g: 0, b: 0 } },
    })
      .jpeg()
      .toBuffer();

    const result = await presizeForSlot(small, { widthMm: 426, heightMm: 426 });
    const meta = await sharp(result.bytes).metadata();

    // A 5031 px slot fed by a 300 px photo stays 300 px. The resolution warning is
    // the editor's job (VLD-RES); spending 48 MB to blur it is not the renderer's.
    expect(meta.width).toBe(300);
  });

  it('writes JPEG, which is what keeps the PDF a passthrough rather than a re-encode', async () => {
    const result = await presizeForSlot(await source(), { widthMm: 100, heightMm: 100 });
    expect((await sharp(result.bytes).metadata()).format).toBe('jpeg');
  });
});
