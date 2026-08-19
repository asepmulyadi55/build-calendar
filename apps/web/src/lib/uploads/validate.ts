/**
 * Upload validation (NFR-S03).
 *
 * Files are identified by **magic bytes, never by extension**. A user can rename
 * anything to `.jpg`, and what happens next is that we hand those bytes to an
 * image decoder — the worst possible place to have trusted a filename.
 *
 * Allowlist: JPEG, PNG, WebP, HEIC. 15 MB maximum.
 */
export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

export type UploadMime = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/heic';

export interface DetectedType {
  mime: UploadMime;
  /** HEIC is converted to JPEG server-side before anything else touches it. */
  needsConversion: boolean;
}

const ascii = (bytes: Uint8Array, offset: number, length: number): string =>
  String.fromCharCode(...bytes.subarray(offset, offset + length));

/** The HEIF brands an iPhone actually writes. */
const HEIF_BRANDS = new Set([
  'heic',
  'heix',
  'hevc',
  'hevx',
  'heim',
  'heis',
  'hevm',
  'mif1',
  'msf1',
]);

export function detectImageType(bytes: Uint8Array): DetectedType | null {
  if (bytes.length < 12) return null;

  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { mime: 'image/jpeg', needsConversion: false };
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return { mime: 'image/png', needsConversion: false };
  }

  // WebP: "RIFF" .... "WEBP"
  if (ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 4) === 'WEBP') {
    return { mime: 'image/webp', needsConversion: false };
  }

  // HEIC: ISO-BMFF "ftyp" box with a HEIF brand.
  if (ascii(bytes, 4, 4) === 'ftyp' && HEIF_BRANDS.has(ascii(bytes, 8, 4))) {
    return { mime: 'image/heic', needsConversion: true };
  }

  return null;
}

export type UploadRejection = 'empty' | 'tooLarge' | 'unsupportedType';

export type UploadValidation =
  { ok: true; mime: UploadMime } | { ok: false; reason: UploadRejection };

/** @param filename kept for the gallery label only. It never decides anything. */
export function validateUpload(bytes: Uint8Array, _filename: string): UploadValidation {
  if (bytes.length === 0) return { ok: false, reason: 'empty' };
  if (bytes.length > MAX_UPLOAD_BYTES) return { ok: false, reason: 'tooLarge' };

  const detected = detectImageType(bytes);
  if (!detected) return { ok: false, reason: 'unsupportedType' };

  return { ok: true, mime: detected.mime };
}
