// Client-side downscale for large phone photos before upload — mobile
// networks fail on multi-megabyte originals. Deliberately best-effort: if
// any browser API is unavailable or the re-encode wouldn't actually shrink
// the file, the original is returned untouched so upload still works.
//
// This is not a security step. docforum-core is responsible for stripping
// EXIF/GPS and for content-type sniffing (docforum-core#62); re-encoding
// via canvas happens to drop metadata, but the server's stripping is the
// authoritative one. EXIF is never read or displayed here either way.

export const MAX_IMAGE_DIMENSION = 1600;
export const IMAGE_QUALITY = 0.8;

/** Scales width/height down to fit within `max`, preserving aspect ratio.
 * Never scales up. */
export function fitWithin(
  width: number,
  height: number,
  max = MAX_IMAGE_DIMENSION,
): { width: number; height: number } {
  if (width <= max && height <= max) return { width, height };
  const ratio = Math.min(max / width, max / height);
  return { width: Math.round(width * ratio), height: Math.round(height * ratio) };
}

function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === 'function') {
    return createImageBitmap(file);
  }
  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Could not read image'));
    };
    image.src = objectUrl;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

function renamedToJpeg(fileName: string): string {
  const dot = fileName.lastIndexOf('.');
  return dot > 0 ? `${fileName.slice(0, dot)}.jpg` : `${fileName}.jpg`;
}

export async function prepareImageForUpload(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) return file;

  try {
    const source = await loadBitmap(file);
    const { width, height } = fitWithin(source.width, source.height);
    if (width === source.width && height === source.height && file.type !== 'image/png') {
      return file;
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) return file;
    context.drawImage(source, 0, 0, width, height);

    const outputType = file.type === 'image/png' || file.type === 'image/webp' ? file.type : 'image/jpeg';
    const blob = await canvasToBlob(canvas, outputType, IMAGE_QUALITY);
    if (!blob || blob.size >= file.size) return file;

    const name = outputType === 'image/jpeg' ? renamedToJpeg(file.name) : file.name;
    return new File([blob], name, { type: outputType });
  } catch {
    return file;
  }
}
