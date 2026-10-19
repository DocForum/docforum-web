import { afterEach, describe, expect, it, vi } from 'vitest';
import { downscaleImage } from './image-downscale';

function imageFile(name = 'photo.jpg', type = 'image/jpeg'): File {
  return new File(['image-bytes'], name, { type });
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('downscaleImage', () => {
  it('returns non-image and animated/SVG files untouched', async () => {
    const pdf = new File(['%PDF-1.4'], 'scan.pdf', { type: 'application/pdf' });
    const gif = imageFile('anim.gif', 'image/gif');
    const svg = new File(['<svg/>'], 'icon.svg', { type: 'image/svg+xml' });

    await expect(downscaleImage(pdf)).resolves.toBe(pdf);
    await expect(downscaleImage(gif)).resolves.toBe(gif);
    await expect(downscaleImage(svg)).resolves.toBe(svg);
  });

  it('leaves images that already fit within maxDimension alone', async () => {
    const close = vi.fn();
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue({ width: 800, height: 600, close }));
    const file = imageFile();

    await expect(downscaleImage(file, { maxDimension: 1600 })).resolves.toBe(file);
    expect(close).toHaveBeenCalled();
  });

  it('draws larger images to a canvas and re-encodes with the quality setting', async () => {
    const close = vi.fn();
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue({ width: 3200, height: 1600, close }));
    const drawImage = vi.fn();
    const toBlob = vi.fn((callback: (blob: Blob | null) => void, type: string, quality: number) => {
      callback(new Blob(['small'], { type }));
      expect(type).toBe('image/jpeg');
      expect(quality).toBe(0.6);
    });
    const canvas = {
      width: 0,
      height: 0,
      getContext: () => ({ drawImage }),
      toBlob,
    };
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'canvas') return canvas as unknown as HTMLElement;
      return originalCreateElement(tag);
    });

    const result = await downscaleImage(imageFile('holiday.JPG'), { maxDimension: 1600, quality: 0.6 });

    expect(canvas.width).toBe(1600);
    expect(canvas.height).toBe(800);
    expect(drawImage).toHaveBeenCalled();
    expect(result).toBeInstanceOf(File);
    expect(result.name).toBe('holiday.jpg');
    expect(result.type).toBe('image/jpeg');
  });
});
