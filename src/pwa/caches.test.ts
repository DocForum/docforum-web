import { afterEach, describe, expect, it, vi } from 'vitest';
import { clearCachedUserData } from './caches';

function mockCaches(names: string[]) {
  const deleted: string[] = [];
  vi.stubGlobal('caches', {
    keys: vi.fn().mockResolvedValue(names),
    delete: vi.fn(async (name: string) => {
      deleted.push(name);
      return true;
    }),
  });
  return deleted;
}

describe('logout cache cleanup', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('deletes app-owned caches that could hold user data', async () => {
    const deleted = mockCaches(['workbox-precache-v2-https://docforum.github.io/', 'docforum-user-data']);

    await clearCachedUserData();

    expect(deleted).toEqual(['docforum-user-data']);
  });

  it('keeps the static precache so the offline shell still loads after logout', async () => {
    const deleted = mockCaches(['workbox-precache-v2-https://docforum.github.io/']);

    await clearCachedUserData();

    expect(deleted).toEqual([]);
  });

  it('leaves caches belonging to other origins/apps alone', async () => {
    const deleted = mockCaches(['third-party-cache']);

    await clearCachedUserData();

    expect(deleted).toEqual([]);
  });

  it('is a no-op where the Cache API does not exist', async () => {
    vi.unstubAllGlobals();
    // happy-dom doesn't implement `caches`; this must not throw.
    await expect(clearCachedUserData()).resolves.toBeUndefined();
  });
});
