export const DEFAULT_MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const DEFAULT_IMAGE_MAX_DIMENSION = 2048;
export const DEFAULT_IMAGE_QUALITY = 0.82;

export interface SniffedFileType {
  mime: string;
  extension: string;
}

export interface FileValidationOptions {
  accept?: string;
  maxSizeBytes?: number;
}

export interface ValidatedUploadFile {
  file: File;
  mime: string;
  extension: string;
}

function startsWith(bytes: Uint8Array, signature: number[], offset = 0): boolean {
  if (bytes.length < offset + signature.length) return false;
  return signature.every((value, index) => bytes[offset + index] === value);
}

function ascii(bytes: Uint8Array, start: number, length: number): string {
  return String.fromCharCode(...bytes.slice(start, start + length));
}

export async function sniffFileType(file: Blob): Promise<SniffedFileType | null> {
  const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());

  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return { mime: 'image/png', extension: 'png' };
  }
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) {
    return { mime: 'image/jpeg', extension: 'jpg' };
  }
  if (ascii(bytes, 0, 6) === 'GIF87a' || ascii(bytes, 0, 6) === 'GIF89a') {
    return { mime: 'image/gif', extension: 'gif' };
  }
  if (ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 4) === 'WEBP') {
    return { mime: 'image/webp', extension: 'webp' };
  }
  if (ascii(bytes, 0, 5) === '%PDF-') {
    return { mime: 'application/pdf', extension: 'pdf' };
  }
  if (ascii(bytes, 4, 4) === 'ftyp') {
    const brand = ascii(bytes, 8, 4).toLowerCase();
    if (['heic', 'heix', 'hevc', 'mif1'].includes(brand)) {
      return { mime: 'image/heic', extension: 'heic' };
    }
  }
  if (startsWith(bytes, [0x50, 0x4b, 0x03, 0x04])) {
    return { mime: 'application/zip', extension: 'zip' };
  }

  return null;
}

function matchesAccept(sniffed: SniffedFileType, accept?: string): boolean {
  if (!accept || accept.trim() === '') return true;

  const entries = accept
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);

  return entries.some((entry) => {
    if (entry === '*/*' || entry === '*') return true;
    if (entry.endsWith('/*')) return sniffed.mime.startsWith(entry.slice(0, -1));
    if (entry.startsWith('.')) return entry.slice(1) === sniffed.extension;
    return entry === sniffed.mime;
  });
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export async function validateUploadFile(
  file: File,
  options: FileValidationOptions = {},
): Promise<ValidatedUploadFile> {
  const maxSizeBytes = options.maxSizeBytes ?? DEFAULT_MAX_UPLOAD_BYTES;

  if (file.size === 0) {
    throw new Error('That file is empty.');
  }
  if (file.size > maxSizeBytes) {
    throw new Error(`That file is too large. The maximum size is ${formatBytes(maxSizeBytes)}.`);
  }

  const sniffed = await sniffFileType(file);
  if (!sniffed) {
    throw new Error('That file type is not supported. Use an image or PDF.');
  }
  if (!matchesAccept(sniffed, options.accept)) {
    throw new Error(`That file type is not accepted here. Allowed types: ${options.accept}.`);
  }

  const normalized =
    file.type === sniffed.mime
      ? file
      : new File([file], file.name, { type: sniffed.mime, lastModified: file.lastModified });

  return { file: normalized, ...sniffed };
}

export interface DownscaleOptions {
  maxDimension?: number;
  quality?: number;
}

export async function downscaleImage(file: File, options: DownscaleOptions = {}): Promise<File> {
  const maxDimension = options.maxDimension ?? DEFAULT_IMAGE_MAX_DIMENSION;
  const quality = options.quality ?? DEFAULT_IMAGE_QUALITY;

  if (!file.type.startsWith('image/') || maxDimension <= 0) return file;
  if (typeof createImageBitmap !== 'function' || typeof document === 'undefined') return file;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file;
  }

  try {
    const longestSide = Math.max(bitmap.width, bitmap.height);
    if (longestSide <= maxDimension) return file;

    const scale = maxDimension / longestSide;
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));

    const context = canvas.getContext('2d');
    if (!context) return file;

    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, file.type || 'image/jpeg', quality);
    });
    if (!blob) return file;

    return new File([blob], file.name, {
      type: blob.type || file.type,
      lastModified: file.lastModified,
    });
  } finally {
    bitmap.close?.();
  }
}
