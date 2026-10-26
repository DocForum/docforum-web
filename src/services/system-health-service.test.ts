import { afterEach, describe, expect, it, vi } from 'vitest';
import { getReadiness, runJob } from './system-health-service';
import { ApiError } from './api-client';
import type { ReadinessReport } from '../types/models';

const NOT_READY: ReadinessReport = {
  status: 'not_ready',
  checkedAt: '2026-10-18T12:00:00.000Z',
  checks: [{ name: 'migrations', status: 'fail', required: true, durationMs: 12, message: '2 migrations pending' }],
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

describe('getReadiness', () => {
  it('returns the report docforum-core sends with a 503', async () => {
    respond(503, NOT_READY);
    await expect(getReadiness('token')).resolves.toEqual(NOT_READY);
  });

  it("still throws a 503 that isn't a readiness report", async () => {
    respond(503, '<html>Service Unavailable</html>', 'text/html');
    await expect(getReadiness('token')).rejects.toMatchObject({ status: 503 });
  });

  it('throws other failures untouched', async () => {
    respond(404, { message: 'Not Found' });
    await expect(getReadiness('token')).rejects.toBeInstanceOf(ApiError);
  });
});

describe('runJob', () => {
  it('posts to the job by its encoded name', async () => {
    const fetchSpy = respond(200, { id: 'run-1' });
    await runJob('reports/daily digest', 'token');

    const [url, init] = fetchSpy.mock.calls[0];
    expect(String(url)).toMatch(/\/admin\/jobs\/reports%2Fdaily%20digest\/run$/);
    expect(init).toMatchObject({ method: 'POST', headers: expect.objectContaining({ Authorization: 'Bearer token' }) });
  });
});
