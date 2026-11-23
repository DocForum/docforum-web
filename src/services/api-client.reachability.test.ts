import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiFetch, ApiError } from './api-client';
import { useApiReachabilityStore } from '../store/api-reachability-store';

function jsonResponse(body: unknown, status: number, headers: Record<string, string> = {}): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status >= 200 && status < 300 ? 'OK' : 'Error',
    headers: new Headers({ 'content-type': 'application/json', ...headers }),
    json: async () => body,
  } as unknown as Response;
}

beforeEach(() => {
  useApiReachabilityStore.getState().reset();
});

afterEach(() => {
  vi.unstubAllGlobals();
  useApiReachabilityStore.getState().reset();
});

describe('api-client reachability tracking', () => {
  it('marks API unreachable on network error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    await expect(apiFetch('/health/live', { retry: false })).rejects.toBeInstanceOf(ApiError);
    expect(useApiReachabilityStore.getState().isApiReachable).toBe(false);
  });

  it('marks API unreachable on 5xx server error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ message: 'Server error' }, 500)));

    await expect(apiFetch('/health/live', { retry: false })).rejects.toBeInstanceOf(ApiError);
    expect(useApiReachabilityStore.getState().isApiReachable).toBe(false);
  });

  it('clears unreachable state on successful 2xx request', async () => {
    useApiReachabilityStore.getState().markUnreachable();
    expect(useApiReachabilityStore.getState().isApiReachable).toBe(false);

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ ok: true }, 200)));

    await apiFetch('/health/live', { retry: false });
    expect(useApiReachabilityStore.getState().isApiReachable).toBe(true);
  });

  it('does not mark unreachable on 4xx client errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ message: 'Not found' }, 404)));

    await expect(apiFetch('/somewhere', { retry: false })).rejects.toBeInstanceOf(ApiError);
    expect(useApiReachabilityStore.getState().isApiReachable).toBe(true);
  });
});

