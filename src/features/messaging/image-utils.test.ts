import { describe, expect, it } from 'vitest';
import { fitWithin, prepareImageForUpload } from './image-utils';

describe('fitWithin', () => {
  it('leaves images already within the bound unchanged', () => {
    expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600 });
  });

  it('scales the longest edge down while preserving aspect ratio', () => {
    expect(fitWithin(4000, 3000, 1600)).toEqual({ width: 1600, height: 1200 });
    expect(fitWithin(3000, 4000, 1600)).toEqual({ width: 1200, height: 1600 });
  });

  it('never scales small images up', () => {
    expect(fitWithin(100, 100, 1600)).toEqual({ width: 100, height: 100 });
  });
});

describe('prepareImageForUpload', () => {
  it('passes non-images through untouched', async () => {
    const pdf = new File([new Uint8Array([1, 2, 3])], 'scan.pdf', { type: 'application/pdf' });
    await expect(prepareImageForUpload(pdf)).resolves.toBe(pdf);
  });
});
