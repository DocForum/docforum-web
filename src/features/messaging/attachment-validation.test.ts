import { describe, expect, it } from 'vitest';
import { attachmentKind, formatBytes, MAX_ATTACHMENT_BYTES, validateAttachment } from './attachment-validation';

function fakeFile(name: string, type: string, size: number): File {
  return { name, type, size } as unknown as File;
}

describe('validateAttachment', () => {
  it('accepts a small JPEG', () => {
    expect(validateAttachment(fakeFile('rash.jpg', 'image/jpeg', 1024))).toBeNull();
  });

  it('accepts a PDF', () => {
    expect(validateAttachment(fakeFile('report.pdf', 'application/pdf', 2048))).toBeNull();
  });

  it('rejects SVG (script-injection vector)', () => {
    expect(validateAttachment(fakeFile('x.svg', 'image/svg+xml', 100))).toMatch(/supported file/i);
  });

  it('rejects an executable', () => {
    expect(validateAttachment(fakeFile('x.exe', 'application/x-msdownload', 100))).toMatch(/supported file/i);
  });

  it('rejects a file larger than the cap', () => {
    expect(validateAttachment(fakeFile('huge.jpg', 'image/jpeg', MAX_ATTACHMENT_BYTES + 1))).toMatch(
      /larger than 10.0 MB/,
    );
  });

  it('rejects an empty file', () => {
    expect(validateAttachment(fakeFile('empty.png', 'image/png', 0))).toMatch(/is empty/);
  });
});

describe('attachmentKind', () => {
  it('classifies PDFs separately from images', () => {
    expect(attachmentKind('application/pdf')).toBe('pdf');
    expect(attachmentKind('image/jpeg')).toBe('image');
  });
});

describe('formatBytes', () => {
  it('formats B, KB and MB', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(2048)).toBe('2 KB');
    expect(formatBytes(10 * 1024 * 1024)).toBe('10.0 MB');
  });
});
