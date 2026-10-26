import { afterEach, describe, expect, it, vi } from 'vitest';
import { listFeatureFlags, updateFeatureFlag } from './feature-flags-service';
import { ApiError } from './api-client';

function respond(status: number, body: unknown) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } }),
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('feature flags service', () => {
  it('lists flags with the admin token', async () => {
    const fetchSpy = respond(200, []);
    await expect(listFeatureFlags('admin-token')).resolves.toEqual([]);

    const [url, init] = fetchSpy.mock.calls[0];
    expect(String(url)).toMatch(/\/admin\/flags$/);
    expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer admin-token');
  });

  it('PATCHes only the changed fields, with the key escaped into the path', async () => {
    const fetchSpy = respond(200, {});
    await updateFeatureFlag('odd/key', { enabled: true, expectedUpdatedAt: '2026-10-01T00:00:00.000Z' }, 'admin-token');

    const [url, init] = fetchSpy.mock.calls[0];
    expect(String(url)).toMatch(/\/admin\/flags\/odd%2Fkey$/);
    expect(init?.method).toBe('PATCH');
    expect(JSON.parse(String(init?.body))).toEqual({ enabled: true, expectedUpdatedAt: '2026-10-01T00:00:00.000Z' });
  });

  it('surfaces a conflict as an ApiError with its status', async () => {
    respond(409, { message: 'Flag was modified' });
    const attempt = updateFeatureFlag('wallet_payments', { enabled: false, expectedUpdatedAt: 'x' }, 'admin-token');
    await expect(attempt).rejects.toBeInstanceOf(ApiError);
    await expect(attempt).rejects.toMatchObject({ status: 409, message: 'Flag was modified' });
  });
});
