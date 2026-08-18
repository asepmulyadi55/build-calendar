import { describe, expect, it } from 'vitest';
import { MAX_UPLOAD_BYTES, detectImageType, validateUpload } from './validate';

/**
 * NFR-S03: uploads are validated by **magic bytes, not extension**. Allowlist is
 * JPEG, PNG, WebP, HEIC; 15 MB maximum.
 *
 * Trusting the extension means a user can hand us anything by renaming it. These
 * bytes are then fed to an image decoder, which is exactly the wrong place to be
 * wrong.
 */
const bytes = (...values: number[]) => new Uint8Array([...values, ...new Array(64).fill(0)]);

const JPEG = bytes(0xff, 0xd8, 0xff, 0xe0);
const PNG = bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);

function webp(): Uint8Array {
  const buffer = new Uint8Array(64);
  buffer.set([0x52, 0x49, 0x46, 0x46], 0); // RIFF
  buffer.set([0x57, 0x45, 0x42, 0x50], 8); // WEBP
  return buffer;
}

function heic(brand = 'heic'): Uint8Array {
  const buffer = new Uint8Array(64);
  buffer.set([0x00, 0x00, 0x00, 0x18], 0); // box size
  buffer.set([0x66, 0x74, 0x79, 0x70], 4); // ftyp
  buffer.set([...brand].map((c) => c.charCodeAt(0)), 8);
  return buffer;
}

describe('detectImageType', () => {
  it('recognises the four allowed formats by their signature', () => {
    expect(detectImageType(JPEG)?.mime).toBe('image/jpeg');
    expect(detectImageType(PNG)?.mime).toBe('image/png');
    expect(detectImageType(webp())?.mime).toBe('image/webp');
    expect(detectImageType(heic())?.mime).toBe('image/heic');
  });

  it('recognises the HEIF brands an iPhone actually produces', () => {
    for (const brand of ['heic', 'heix', 'mif1', 'heim']) {
      expect(detectImageType(heic(brand)), brand).not.toBeNull();
    }
  });

  it('refuses a file whose bytes are not an allowed image', () => {
    // A PDF, a zip, a script — all things people rename to .jpg.
    expect(detectImageType(bytes(0x25, 0x50, 0x44, 0x46))).toBeNull(); // %PDF
    expect(detectImageType(bytes(0x50, 0x4b, 0x03, 0x04))).toBeNull(); // PK zip
    expect(detectImageType(bytes(0x3c, 0x73, 0x76, 0x67))).toBeNull(); // <svg
    expect(detectImageType(bytes(0x47, 0x49, 0x46, 0x38))).toBeNull(); // GIF, not allowed
    expect(detectImageType(new Uint8Array(0))).toBeNull();
  });

  it('ignores the filename entirely', () => {
    // The point of the rule: bytes decide, names do not.
    expect(detectImageType(bytes(0x25, 0x50, 0x44, 0x46))).toBeNull();
    expect(detectImageType(JPEG)?.mime).toBe('image/jpeg');
  });
});

describe('validateUpload', () => {
  it('accepts an allowed image inside the size limit', () => {
    expect(validateUpload(JPEG, 'holiday.jpg')).toEqual({ ok: true, mime: 'image/jpeg' });
  });

  it('enforces the 15 MB cap from NFR-S03', () => {
    expect(MAX_UPLOAD_BYTES).toBe(15 * 1024 * 1024);

    const huge = new Uint8Array(MAX_UPLOAD_BYTES + 1);
    huge.set([0xff, 0xd8, 0xff, 0xe0], 0);
    expect(validateUpload(huge, 'huge.jpg')).toMatchObject({ ok: false, reason: 'tooLarge' });
  });

  it('rejects a disallowed type by its bytes even with a convincing name', () => {
    const pdf = bytes(0x25, 0x50, 0x44, 0x46);
    expect(validateUpload(pdf, 'family-photo.jpg')).toMatchObject({
      ok: false,
      reason: 'unsupportedType',
    });
  });

  it('rejects an empty file', () => {
    expect(validateUpload(new Uint8Array(0), 'empty.jpg')).toMatchObject({
      ok: false,
      reason: 'empty',
    });
  });
});
