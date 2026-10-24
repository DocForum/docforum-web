import { replaceExtension } from './upload-utils';

export interface DownscaleOptions {
  /** Longest edge in pixels. Images already smaller are returned untouched. */
  maxDimension?: number;
  /** Encoder quality 0–1 for JPEG/WebP output. */
  quality?: number;
}

const DEFAULT_MAX_DIMENSION = 1600;
const DEFAULT_QUALITY = 0.8;
const SKIP_TYPES = new Set(['image/gif', 'image/svg+xml']);

export async function downscaleImage(file: File, options: DownscaleOptions = {}): Promise<File> {
  if (!file.type.startsWith('image/') || SKIP_TYPES.has(file.type)) return file;
  if (typeof document === 'undefined' || typeof createImageBitmap !== 'function') return file;

  const maxDimension = options.maxDimension ?? DEFAULT_MAX_DIMENSION;
  const quality = Math.min(1, Math.max(0.1, options.quality ?? DEFAULT_QUALITY));

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file;
  }

  try {
    const longest = Math.max(bitmap.width, bitmap.height);
    if (longest <= maxDimension) return file;

    const scale = maxDimension / longest;
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) return file;
    context.drawImage(bitmap, 0, 0, width, height);

    const outputType = outputMimeType(file.type);
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, outputType, quality);
    });
    if (!blob) return file;

    return new File([blob], replaceExtension(file.name, outputType), {
      type: outputType,
      lastModified: Date.now(),
    });
  } finally {
    bitmap.close?.();
  }
}

function outputMimeType(input: string): string {
  if (input === 'image/png') return 'image/png';
  if (input === 'image/webp') return 'image/webp';
  return 'image/jpeg';
}
