import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ApiError,
  IDEMPOTENCY_HEADER,
  apiFetch,
  computeBackoffMs,
  createIdempotencyKey,
  isRetryableError,
} from './api-client';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

const noWait = { baseDelayMs: 1, sleep: async () => {} };

describe('apiFetch retry policy (#85)', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
  });

  it('retries reads with backoff after a retryable failure', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ message: 'waking up' }, 503))
      .mockResolvedValueOnce(jsonResponse({ message: 'waking up' }, 502))
      .mockResolvedValueOnce(jsonResponse({ ok: true }));

    await expect(apiFetch('/doctor/queue/today', { retry: noWait })).resolves.toEqual({
      ok: true,
    });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('does not retry a 404', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ message: 'Not found' }, 404));

    await expect(apiFetch('/appointments/missing', { retry: noWait })).rejects.toBeInstanceOf(
      ApiError,
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('never retries a mutation without an Idempotency-Key', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ message: 'cold start' }, 503));

    await expect(
      apiFetch('/payments/intents', { method: 'POST', body: {}, retry: noWait }),
    ).rejects.toBeInstanceOf(ApiError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('retries a mutation when it carries an Idempotency-Key, reusing the same key', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ message: 'cold start' }, 503))
      .mockResolvedValueOnce(jsonResponse({ id: 'intent-1' }));

    const key = createIdempotencyKey();
    await expect(
      apiFetch('/payments/intents', {
        method: 'POST',
        body: { amountStroops: '100' },
        idempotencyKey: key,
        retry: noWait,
      }),
    ).resolves.toEqual({ id: 'intent-1' });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const headers = fetchMock.mock.calls.map(
      ([, init]) => (init as RequestInit).headers as Record<string, string>,
    );
    expect(headers[0][IDEMPOTENCY_HEADER]).toBe(key);
    expect(headers[1][IDEMPOTENCY_HEADER]).toBe(key);
  });

  it('does not retry network failures while the browser reports offline', async () => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(apiFetch('/care-threads', { retry: noWait })).rejects.toBeInstanceOf(TypeError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not retry aborted requests', async () => {
    const abortError = new Error('Aborted');
    abortError.name = 'AbortError';
    fetchMock.mockRejectedValue(abortError);

    await expect(apiFetch('/care-threads', { retry: noWait })).rejects.toThrow('Aborted');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('retry helpers (#85)', () => {
  it('classifies retryable errors', () => {
    expect(isRetryableError(new ApiError('busy', 503))).toBe(true);
    expect(isRetryableError(new ApiError('timeout', 408))).toBe(true);
    expect(isRetryableError(new ApiError('rate limited', 429))).toBe(true);
    expect(isRetryableError(new ApiError('bad request', 400))).toBe(false);
    expect(isRetryableError(new ApiError('conflict', 409))).toBe(false);
    expect(isRetryableError(new TypeError('Failed to fetch'))).toBe(true);
  });

  it('backs off exponentially with jitter and a cap', () => {
    expect(computeBackoffMs(1, 100, 10_000, () => 0)).toBe(50);
    expect(computeBackoffMs(2, 100, 10_000, () => 0)).toBe(100);
    expect(computeBackoffMs(3, 100, 10_000, () => 0)).toBe(200);
    expect(computeBackoffMs(10, 100, 500, () => 0)).toBe(250);
  });

  it('generates a fresh key per call', () => {
    const a = createIdempotencyKey();
    const b = createIdempotencyKey();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThan(8);
  });
});
