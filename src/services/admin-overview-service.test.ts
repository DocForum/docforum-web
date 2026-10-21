import { afterEach, describe, expect, it, vi } from 'vitest';
import { getAdminOverview } from './admin-overview-service';
import { ApiError } from './api-client';
import type { AdminOverview } from '../types/models';

const OVERVIEW: AdminOverview = {
  generatedAt: '2026-10-21T09:00:00.000Z',
  sections: [
    {
      key: 'stuck_payments',
      label: 'Stuck payments',
      available: true,
      count: 2,
      oldestItemCreatedAt: '2026-10-19T09:00:00.000Z',
    },
    { key: 'failed_jobs', label: 'Failed jobs', available: false, count: null, oldestItemCreatedAt: null },
  ],
};

function respond(status: number, body: unknown, contentType = 'application/json') {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(typeof body === 'string' ? body : JSON.stringify(body), {
      status,
      headers: { 'content-type': contentType },
    }),
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('getAdminOverview', () => {
  it('GETs /admin/overview with the bearer token', async () => {
    const fetchSpy = respond(200, OVERVIEW);

    await expect(getAdminOverview('token')).resolves.toEqual(OVERVIEW);

    const [url, init] = fetchSpy.mock.calls[0];
    expect(String(url)).toMatch(/\/admin\/overview$/);
    expect(init).toMatchObject({
      method: 'GET',
      headers: expect.objectContaining({ Authorization: 'Bearer token' }),
    });
  });

  it("passes the caller's abort signal through", async () => {
    const fetchSpy = respond(200, OVERVIEW);
    const controller = new AbortController();

    await getAdminOverview('token', controller.signal);

    const [, init] = fetchSpy.mock.calls[0];
    expect(init?.signal).toBeInstanceOf(AbortSignal);
  });

  it('lets a 404 through untouched so the board can show its muted notice', async () => {
    respond(404, { message: 'Not Found' });

    const error = await getAdminOverview('token').catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 404 });
  });
});
