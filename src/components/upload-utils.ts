export interface FileSignature {
  mimeType: string;
  bytes: number[];
  offset?: number;
  extra?: { offset: number; bytes: number[] };
}

// Only formats the app uploads are sniffed. The declared `File.type` is
// attacker-controlled; the bytes are what the API will actually receive.
export const FILE_SIGNATURES: FileSignature[] = [
  { mimeType: 'image/jpeg', bytes: [0xff, 0xd8, 0xff] },
  { mimeType: 'image/png', bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { mimeType: 'image/gif', bytes: [0x47, 0x49, 0x46, 0x38] },
  {
    mimeType: 'image/webp',
    bytes: [0x52, 0x49, 0x46, 0x46],
    extra: { offset: 8, bytes: [0x57, 0x45, 0x42, 0x50] },
  },
  { mimeType: 'application/pdf', bytes: [0x25, 0x50, 0x44, 0x46, 0x2d] },
  { mimeType: 'application/zip', bytes: [0x50, 0x4b, 0x03, 0x04] },
];

const EXTENSION_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  pdf: 'application/pdf',
  zip: 'application/zip',
  docx: 'application/zip',
  xlsx: 'application/zip',
  txt: 'text/plain',
  csv: 'text/csv',
  json: 'application/json',
};

const TEXT_TYPES = new Set([
  'text/plain',
  'text/csv',
  'application/json',
  'application/xml',
  'text/xml',
]);

export function extensionOf(name: string): string {
  const index = name.lastIndexOf('.');
  return index === -1 ? '' : name.slice(index + 1).toLowerCase();
}

export function mimeTypeForName(name: string): string | null {
  return EXTENSION_TYPES[extensionOf(name)] ?? null;
}

export function matchesAccept(mimeType: string, accept: string): boolean {
  const tokens = accept
    .split(',')
    .map((token) => token.trim().toLowerCase())
    .filter(Boolean);
  if (tokens.length === 0 || tokens.includes('*/*') || tokens.includes('*')) return true;

  return tokens.some((token) => {
    if (token.startsWith('.')) {
      return EXTENSION_TYPES[token.slice(1)] === mimeType;
    }
    if (token.endsWith('/*')) return mimeType.startsWith(token.slice(0, -1));
    return token === mimeType;
  });
}

/** Read the magic bytes and return the MIME type the bytes actually are. */
export async function sniffMimeType(file: Blob): Promise<string | null> {
  const head = new Uint8Array(await file.slice(0, 32).arrayBuffer());

  for (const signature of FILE_SIGNATURES) {
    const offset = signature.offset ?? 0;
    const matches = signature.bytes.every((byte, index) => head[offset + index] === byte);
    if (!matches) continue;
    if (signature.extra) {
      const extraMatches = signature.extra.bytes.every(
        (byte, index) => head[signature.extra!.offset + index] === byte,
      );
      if (!extraMatches) continue;
    }
    return signature.mimeType;
  }

  // Text formats have no magic number; accept them only when every byte is
  // printable UTF-8-ish (no NUL/control bytes). The declared type still has
  // to be one of the text types we know.
  if (
    head.length > 0 &&
    !head.some((byte) => byte === 0 || (byte < 9 && byte !== 0) || (byte > 13 && byte < 32))
  ) {
    return 'text/plain';
  }
  return null;
}

export interface ValidationOptions {
  accept: string;
  maxBytes: number;
}

export type FileValidation =
  | { ok: true; mimeType: string }
  | { ok: false; error: string; reason: 'empty' | 'size' | 'type' };

export async function validateFile(file: File, options: ValidationOptions): Promise<FileValidation> {
  if (file.size === 0) {
    return { ok: false, error: 'The file is empty.', reason: 'empty' };
  }
  if (file.size > options.maxBytes) {
    return {
      ok: false,
      error: `The file is larger than ${formatBytes(options.maxBytes)}.`,
      reason: 'size',
    };
  }

  const sniffed = await sniffMimeType(file);
  const actual =
    sniffed === 'text/plain' && file.type && TEXT_TYPES.has(file.type) ? file.type : (sniffed ?? null);

  if (!actual) {
    return {
      ok: false,
      error: 'This file type is not supported. Choose an image or PDF.',
      reason: 'type',
    };
  }
  if (!matchesAccept(actual, options.accept)) {
    const expected = options.accept.split(',').map((token) => token.trim()).join(', ');
    return {
      ok: false,
      error: `This file type is not accepted (${expected}).`,
      reason: 'type',
    };
  }

  return { ok: true, mimeType: actual };
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unit]}`;
}

export function replaceExtension(name: string, mimeType: string): string {
  const extension =
    mimeType === 'image/jpeg' ? 'jpg' : mimeType === 'image/webp' ? 'webp' : mimeType === 'image/png' ? 'png' : '';
  const base = name.replace(/\.[^./\\]+$/, '');
  return extension ? `${base}.${extension}` : base;
}
