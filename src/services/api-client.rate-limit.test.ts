import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ApiError,
  DEFAULT_RETRY_AFTER_SECONDS,
  RateLimitError,
  apiFetch,
  parseRetryAfter,
} from './api-client';
import { useRateLimitStore } from '../store/rate-limit-store';

function jsonResponse(body: unknown, status: number, headers: Record<string, string> = {}): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 429 ? 'Too Many Requests' : 'Error',
    headers: new Headers({ 'content-type': 'application/json', ...headers }),
    json: async () => body,
  } as unknown as Response;
}

afterEach(() => {
  vi.unstubAllGlobals();
  useRateLimitStore.getState().clear();
});

describe('parseRetryAfter', () => {
  it('reads delta-seconds', () => {
    expect(parseRetryAfter('120')).toBe(120);
    expect(parseRetryAfter(' 45 ')).toBe(45);
  });

  it('reads an HTTP date relative to now', () => {
    const now = Date.parse('2026-10-20T12:00:00.000Z');
    const header = new Date(now + 90_000).toUTCString();
    expect(parseRetryAfter(header, now)).toBe(90);
  });

  it('returns null for an absent or unusable header', () => {
    expect(parseRetryAfter(null)).toBeNull();
    expect(parseRetryAfter('')).toBeNull();
    expect(parseRetryAfter('soon')).toBeNull();
  });
});

describe('apiFetch 429 handling', () => {
  it('throws a typed RateLimitError carrying Retry-After and raises the global notice', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse({ message: 'Too many attempts' }, 429, { 'Retry-After': '30' }),
      ),
    );

    const error = (await apiFetch('/auth/login', { method: 'POST', body: {} }).catch(
      (e: unknown) => e,
    )) as RateLimitError;

    expect(error).toBeInstanceOf(RateLimitError);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 429, retryAfterSeconds: 30, message: 'Too many attempts' });
    expect(useRateLimitStore.getState().retryAt).not.toBeNull();
    expect(useRateLimitStore.getState().retryAfterSeconds).toBe(30);
  });

  it('falls back to the default wait when Retry-After is missing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ message: 'Slow down' }, 429)));

    const error = (await apiFetch('/auth/login').catch((e: unknown) => e)) as RateLimitError;

    expect(error).toBeInstanceOf(RateLimitError);
    expect(error.retryAfterSeconds).toBe(DEFAULT_RETRY_AFTER_SECONDS);
  });

  it('keeps other non-2xx responses as plain ApiErrors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ message: 'Nope' }, 403)));

    const error = (await apiFetch('/auth/login').catch((e: unknown) => e)) as ApiError;

    expect(error).toBeInstanceOf(ApiError);
    expect(error).not.toBeInstanceOf(RateLimitError);
    expect(useRateLimitStore.getState().retryAt).toBeNull();
  });
});
