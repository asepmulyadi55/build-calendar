import 'server-only';
import sharp from 'sharp';

/**
 * The upload pipeline (P1-US-304).
 *
 * One decode, three derivatives, and the original is discarded — it is never
 * written anywhere. Two rules govern the order of operations:
 *
 * **Orientation is applied, then all metadata is dropped** (NFR-S05). Doing it the
 * other way round makes portrait photos print sideways; skipping the drop leaves
 * GPS coordinates in a file we then serve, and for family photos that is a home
 * address.
 *
 * **Nothing is ever enlarged.** Upscaling invents detail that prints soft, and it
 * would also let a 400 px photo claim to be print-ready.
 */
export interface Derivative {
  bytes: Uint8Array;
  widthPx: number;
  heightPx: number;
}

export interface ProcessedUpload {
  variants: { thumb: Derivative; preview: Derivative; print: Derivative };
  /** Print-derivative dimensions — what decides the DPI a slot can achieve. */
  widthPx: number;
  heightPx: number;
  mime: 'image/jpeg';
  sizeBytes: number;
}

/**
 * §3.1 says to cap the print derivative at exactly what 300 DPI needs for the
 * largest slot it could fill. The spike measured that: an A2 sheet's full-bleed
 * slot is 5031 px wide at 300 DPI. A 4000 px cap would quietly leave A2 at
 * 238 DPI, so the cap is the real number.
 */
export const DERIVATIVES = {
  thumb: { longEdge: 300, quality: 78 },
  preview: { longEdge: 1200, quality: 82 },
  print: { longEdge: 5031, quality: 90 },
} as const;

async function derive(
  source: Buffer,
  longEdge: number,
  quality: number,
): Promise<Derivative> {
  const output = await sharp(source)
    // Never enlarge: `withoutEnlargement` keeps a small photo at its own size.
    .resize({ width: longEdge, height: longEdge, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality, mozjpeg: true })
    .toBuffer({ resolveWithObject: true });

  return {
    bytes: new Uint8Array(output.data),
    widthPx: output.info.width,
    heightPx: output.info.height,
  };
}

/**
 * @param input the uploaded bytes, already validated by magic bytes.
 * @param mime what those bytes actually are. HEIC is decoded here; sharp's libvips
 *   reads HEIF, so no separate converter is needed.
 */
export async function processUpload(input: Buffer, _mime: string): Promise<ProcessedUpload> {
  // One decode for all three derivatives. `rotate()` with no argument applies the
  // EXIF orientation tag to the pixels; the JPEG encoder below then writes no
  // metadata at all, which is what drops GPS, camera model, ICC and XMP together.
  const normalised = await sharp(input)
    .rotate()
    .jpeg({ quality: 100, mozjpeg: false })
    .toBuffer();

  const [thumb, preview, print] = await Promise.all([
    derive(normalised, DERIVATIVES.thumb.longEdge, DERIVATIVES.thumb.quality),
    derive(normalised, DERIVATIVES.preview.longEdge, DERIVATIVES.preview.quality),
    derive(normalised, DERIVATIVES.print.longEdge, DERIVATIVES.print.quality),
  ]);

  return {
    variants: { thumb, preview, print },
    widthPx: print.widthPx,
    heightPx: print.heightPx,
    mime: 'image/jpeg',
    sizeBytes: print.bytes.byteLength + preview.bytes.byteLength + thumb.bytes.byteLength,
  };
}
