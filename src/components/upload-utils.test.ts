import { describe, expect, it } from 'vitest';
import {
  downscaleImage,
  formatBytes,
  sniffFileType,
  validateUploadFile,
} from './upload-utils';

function bytes(...values: number[]): Uint8Array {
  return new Uint8Array(values);
}

function text(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

function file(name: string, content: Uint8Array | string, type = 'application/octet-stream'): File {
  const part: BlobPart = typeof content === 'string' ? content : new Uint8Array(content).buffer;
  return new File([part], name, { type });
}

describe('sniffFileType', () => {
  it.each([
    ['image.png', bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a), 'image/png', 'png'],
    ['photo.jpg', bytes(0xff, 0xd8, 0xff, 0xe0), 'image/jpeg', 'jpg'],
    ['anim.gif', text('GIF89a'), 'image/gif', 'gif'],
    ['pic.webp', new Uint8Array([...text('RIFF'), 0, 0, 0, 0, ...text('WEBP')]), 'image/webp', 'webp'],
    ['result.pdf', text('%PDF-1.7'), 'application/pdf', 'pdf'],
    ['bundle.zip', bytes(0x50, 0x4b, 0x03, 0x04), 'application/zip', 'zip'],
  ])('detects %s from its signature', async (name, content, mime, extension) => {
    await expect(sniffFileType(file(name, content))).resolves.toEqual({ mime, extension });
  });

  it('detects HEIC images by their ftyp brand', async () => {
    const content = new Uint8Array([0, 0, 0, 0, ...text('ftyp'), ...text('heic')]);
    await expect(sniffFileType(file('photo.heic', content))).resolves.toEqual({
      mime: 'image/heic',
      extension: 'heic',
    });
  });

  it('returns null for content it cannot verify', async () => {
    await expect(sniffFileType(file('notes.txt', text('hello world')))).resolves.toBeNull();
  });
});

describe('validateUploadFile', () => {
  const png = file('scan.png', bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a), 'image/png');

  it('accepts a supported file within the size limit', async () => {
    await expect(validateUploadFile(png, { accept: 'image/*' })).resolves.toMatchObject({
      mime: 'image/png',
      extension: 'png',
    });
  });

  it('corrects a declared type that disagrees with the file signature', async () => {
    const mislabelled = file('scan.bin', bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a), 'application/octet-stream');
    const validated = await validateUploadFile(mislabelled, { accept: 'image/*' });
    expect(validated.file.type).toBe('image/png');
  });

  it('rejects an empty file', async () => {
    await expect(validateUploadFile(file('empty.png', new Uint8Array(), 'image/png'))).rejects.toThrow(
      /empty/i,
    );
  });

  it('rejects a file over the size limit', async () => {
    await expect(validateUploadFile(png, { maxSizeBytes: 4 })).rejects.toThrow(/too large/i);
  });

  it('rejects a signature outside the accepted list', async () => {
    const pdf = file('result.pdf', text('%PDF-1.7'), 'application/pdf');
    await expect(validateUploadFile(pdf, { accept: 'image/*' })).rejects.toThrow(/not accepted/i);
  });

  it('rejects an unverifiable signature even if the declared type looks valid', async () => {
    const disguised = file('fake.png', text('not really a png'), 'image/png');
    await expect(validateUploadFile(disguised, { accept: 'image/*' })).rejects.toThrow(/not supported/i);
  });
});

describe('downscaleImage', () => {
  it('passes non-image files through unchanged', async () => {
    const pdf = file('result.pdf', text('%PDF-1.7'), 'application/pdf');
    await expect(downscaleImage(pdf)).resolves.toBe(pdf);
  });

  it('passes images through when the canvas pipeline is unavailable', async () => {
    const original = globalThis.createImageBitmap;
    // @ts-expect-error – remove the platform API for this assertion.
    delete globalThis.createImageBitmap;
    const png = file('scan.png', bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a), 'image/png');
    try {
      await expect(downscaleImage(png, { maxDimension: 10 })).resolves.toBe(png);
    } finally {
      if (original) globalThis.createImageBitmap = original;
    }
  });
});

describe('formatBytes', () => {
  it('formats bytes, kilobytes and megabytes', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(2048)).toBe('2 KB');
    expect(formatBytes(2 * 1024 * 1024)).toBe('2.0 MB');
  });
});
