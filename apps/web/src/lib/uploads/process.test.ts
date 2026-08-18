import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { DERIVATIVES, processUpload } from './process';

/**
 * NFR-S05: EXIF metadata, **including GPS**, is stripped during processing.
 *
 * These are family photos. A phone writes the coordinates of the room it was taken
 * in, so an un-stripped derivative served from our bucket is a home address. This
 * is the single most important test in the upload path.
 *
 * Orientation is applied first, then everything is dropped — otherwise a portrait
 * photo silently prints sideways once its EXIF is gone.
 */
async function photoWithExif(options: { orientation?: number } = {}): Promise<Buffer> {
  return sharp({
    create: { width: 1200, height: 800, channels: 3, background: { r: 200, g: 120, b: 80 } },
  })
    .withExif({
      IFD0: { Make: 'Apple', Model: 'iPhone 15' },
      // Jakarta. If this survives, so does someone's living room.
      GPS: { GPSLatitude: '6/1 12/1 30/1', GPSLatitudeRef: 'S', GPSLongitude: '106/1 49/1 0/1' },
      ...(options.orientation ? { IFD0: { Orientation: String(options.orientation) } } : {}),
    })
    .jpeg()
    .toBuffer();
}

describe('processUpload', () => {
  it('produces exactly the three derivatives the story names', async () => {
    const result = await processUpload(await photoWithExif(), 'image/jpeg');

    expect(Object.keys(result.variants).sort()).toEqual(['preview', 'print', 'thumb']);
    expect(DERIVATIVES.thumb.longEdge).toBe(300);
    expect(DERIVATIVES.preview.longEdge).toBe(1200);
    // The print cap is what an A2 sheet needs at 300 DPI — the spike measured
    // 5031 px, and a 4000 px cap would leave A2 at 238 DPI.
    expect(DERIVATIVES.print.longEdge).toBeGreaterThanOrEqual(5031);
  });

  it('strips every scrap of EXIF, GPS first', async () => {
    const result = await processUpload(await photoWithExif(), 'image/jpeg');

    for (const [name, variant] of Object.entries(result.variants)) {
      const metadata = await sharp(variant.bytes).metadata();

      expect(metadata.exif, `${name} kept an EXIF block`).toBeUndefined();
      expect(metadata.icc, `${name} kept an ICC profile`).toBeUndefined();
      expect(metadata.iptc, `${name} kept IPTC`).toBeUndefined();
      expect(metadata.xmp, `${name} kept XMP`).toBeUndefined();

      // Belt and braces: the raw bytes must not contain the marker either.
      const raw = Buffer.from(variant.bytes).toString('latin1');
      expect(raw.includes('GPS'), `${name} mentions GPS`).toBe(false);
      expect(raw.includes('iPhone'), `${name} mentions the camera`).toBe(false);
    }
  });

  it('applies EXIF orientation before dropping it, so nothing prints sideways', async () => {
    // Orientation 6 means "rotate 90° clockwise on display". Once EXIF is gone the
    // rotation has to already be baked into the pixels.
    // `withMetadata({orientation})` is what writes a tag `rotate()` will read;
    // `withExif({IFD0:{Orientation}})` writes the block but reports orientation 1.
    const rotated = await sharp({
      create: { width: 1200, height: 800, channels: 3, background: { r: 10, g: 10, b: 10 } },
    })
      .withMetadata({ orientation: 6 })
      .jpeg()
      .toBuffer();

    const result = await processUpload(rotated, 'image/jpeg');
    const print = await sharp(result.variants.print.bytes).metadata();

    // The landscape source becomes portrait once the rotation is applied.
    expect(print.height!).toBeGreaterThan(print.width!);
  });

  it('never enlarges a small photo — upscaling invents detail that will print soft', async () => {
    const small = await sharp({
      create: { width: 400, height: 300, channels: 3, background: { r: 0, g: 0, b: 0 } },
    })
      .jpeg()
      .toBuffer();

    const result = await processUpload(small, 'image/jpeg');
    const print = await sharp(result.variants.print.bytes).metadata();

    expect(print.width).toBe(400);
    expect(print.height).toBe(300);
  });

  it('reports the print dimensions, which are what decide print DPI', async () => {
    const result = await processUpload(await photoWithExif(), 'image/jpeg');
    expect(result.widthPx).toBe(1200);
    expect(result.heightPx).toBe(800);
  });

  it('writes JPEG for every derivative, whatever came in', async () => {
    const png = await sharp({
      create: { width: 900, height: 600, channels: 3, background: { r: 5, g: 5, b: 5 } },
    })
      .png()
      .toBuffer();

    const result = await processUpload(png, 'image/png');

    for (const variant of Object.values(result.variants)) {
      expect((await sharp(variant.bytes).metadata()).format).toBe('jpeg');
    }
    expect(result.mime).toBe('image/jpeg');
  });

  it('rejects bytes that are not a decodable image rather than storing junk', async () => {
    await expect(processUpload(Buffer.from('not an image'), 'image/jpeg')).rejects.toThrow();
  });
});
