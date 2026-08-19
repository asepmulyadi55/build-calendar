/**
 * RQ-MEM-03 — every image is resized to exactly the pixels its slot needs at
 * 300 DPI before Chromium sees it.
 *
 * Chromium decodes whatever it is handed. The spike measured the difference as
 * 48 MB against 7 MB per image, which on a 1 GB box is the whole question. A
 * 4000 px source feeding a slot that prints at 1500 px is a defect, not a
 * quality choice.
 */
import sharp from 'sharp';

/**
 * Must run before the first sharp operation, not after (spike §3.1). libvips
 * otherwise keeps an operation cache whose native allocations never come back to
 * the OS between jobs, and the worker's RSS climbs job after job while the JS heap
 * stays flat. Paired with `MALLOC_ARENA_MAX=2` in the Dockerfile.
 */
sharp.cache(false);
sharp.concurrency(1);

const MM_PER_INCH = 25.4;
export const PRINT_DPI = 300;

/** JPEG quality for the print derivative. High enough that the encoder is not the
 *  limiting factor at 300 DPI, low enough that a 12-sheet PDF stays sendable. */
const PRINT_QUALITY = 90;

export function slotPixelsAt300Dpi(mm: number): { px: number } {
  if (!Number.isFinite(mm) || mm <= 0) {
    throw new RangeError(`slot width must be positive, received ${String(mm)}`);
  }
  return { px: Math.round((mm / MM_PER_INCH) * PRINT_DPI) };
}

export interface PresizedImage {
  readonly bytes: Buffer;
  readonly widthPx: number;
  readonly heightPx: number;
}

export async function presizeForSlot(
  source: Buffer,
  slot: { widthMm: number; heightMm: number },
): Promise<PresizedImage> {
  const width = slotPixelsAt300Dpi(slot.widthMm).px;
  const height = slotPixelsAt300Dpi(slot.heightMm).px;

  const output = await sharp(source)
    // `withoutEnlargement` matters for memory as much as for quality: upscaling a
    // small photo to 5031 px would allocate the very buffer this rule exists to
    // avoid, and invent no detail doing it. The editor already warned the user
    // (VLD-RES) before they got here.
    .resize(width, height, { fit: 'cover', kernel: 'lanczos3', withoutEnlargement: true })
    .jpeg({ quality: PRINT_QUALITY, mozjpeg: false })
    .toBuffer({ resolveWithObject: true });

  return {
    bytes: output.data,
    widthPx: output.info.width,
    heightPx: output.info.height,
  };
}
