import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ApiError,
  ApiTimeoutError,
  DEFAULT_TIMEOUT_MS,
  IDEMPOTENCY_HEADER,
  NETWORK_ERROR_CODE,
  SLOW_REQUEST_TIMEOUT_MS,
  apiFetch,
  apiFetchBlob,
  apiFetchForm,
  computeBackoffMs,
  createIdempotencyKey,
  isAbortError,
  isRetryableError,
  refreshSession,
} from './api-client';
import { bootstrapSession } from './session';
import { useAuthStore } from '../store/auth-store';
import { clearCsrfToken } from './csrf-storage';
import type { User } from '../types/models';

function jsonResponse(a: unknown, b: unknown = 200): Response {
  const statusFirst = typeof a === 'number';
  const status = statusFirst ? (a as number) : (typeof b === 'number' ? b : 200);
  const body = statusFirst ? b : a;
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

    await expect(apiFetch('/care-threads', { retry: noWait })).rejects.toMatchObject({
      name: 'ApiError',
      status: 0,
      code: NETWORK_ERROR_CODE,
    });
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

function deferredResponse(): { promise: Promise<Response>; settle: (response: Response) => void } {
  let settle!: (response: Response) => void;
  const promise = new Promise<Response>((resolve) => {
    settle = resolve;
  });
  return { promise, settle };
}

function hungFetch() {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(() => new Promise<Response>(() => {}));
}

/** Like `hungFetch`, but abort-aware the way a real `fetch` is: it settles
 * shortly *after* the signal aborts, never synchronously — real fetch
 * rejects from a queued task, which is exactly what lets a timeout beat an
 * abort to the race in `runFetch`. */
function abortableHungFetch() {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(
    (_input: RequestInfo | URL, init?: RequestInit) =>
      new Promise<Response>((_, reject) => {
        const signal = init?.signal;
        if (!signal) return;
        if (signal.aborted) {
          reject(signal.reason);
          return;
        }
        signal.addEventListener('abort', () => {
          setTimeout(() => reject(signal.reason), 0);
        });
      }),
  );
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
  clearCsrfToken();
  useAuthStore.setState({ user: null, accessToken: null, csrfToken: null, status: 'idle' });
});

describe('timeouts', () => {
  it('fails a hung request with ApiTimeoutError and aborts the fetch', async () => {
    vi.useFakeTimers();
    const fetchSpy = hungFetch();

    const attempt = apiFetch('/slow', { timeoutMs: 1000 });
    const assertion = expect(attempt).rejects.toBeInstanceOf(ApiTimeoutError);
    await vi.advanceTimersByTimeAsync(1001);
    await assertion;

    const init = fetchSpy.mock.calls[0][1] as RequestInit;
    expect((init.signal as AbortSignal).aborted).toBe(true);
    const error = await attempt.catch((e: unknown) => e);
    expect(error).toMatchObject({ name: 'ApiTimeoutError', path: '/slow', timeoutMs: 1000 });
    expect(isAbortError(error)).toBe(false);
  });

  it('uses the default timeout when none is given', async () => {
    vi.useFakeTimers();
    const attempt = apiFetch('/anything');
    const assertion = expect(attempt).rejects.toMatchObject({
      name: 'ApiTimeoutError',
      timeoutMs: DEFAULT_TIMEOUT_MS,
    });
    await vi.advanceTimersByTimeAsync(DEFAULT_TIMEOUT_MS + 1);
    await assertion;
  });

  it('keeps the default timeout longer than a cold start, and slow endpoints longer still', () => {
    expect(DEFAULT_TIMEOUT_MS).toBeGreaterThanOrEqual(60_000);
    expect(SLOW_REQUEST_TIMEOUT_MS).toBeGreaterThan(DEFAULT_TIMEOUT_MS);
  });

  it('applies the timeout to mutations too', async () => {
    vi.useFakeTimers();
    const attempt = apiFetch('/things', { method: 'POST', body: { a: 1 }, timeoutMs: 500 });
    const assertion = expect(attempt).rejects.toBeInstanceOf(ApiTimeoutError);
    await vi.advanceTimersByTimeAsync(501);
    await assertion;
  });

  it('does not time out a request that answers in time', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(200, { ok: true }));
    await expect(apiFetch('/fast', { timeoutMs: 10_000 })).resolves.toEqual({ ok: true });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});

describe('cancellation', () => {
  it('rejects an aborted caller with its abort reason, not a timeout or ApiError', async () => {
    const fetchSpy = hungFetch();
    const controller = new AbortController();

    const attempt = apiFetch('/slow', { signal: controller.signal });
    const assertion = expect(attempt).rejects.toSatisfy(isAbortError);
    controller.abort();
    await assertion;

    const error = await attempt.catch((e: unknown) => e);
    expect(error).not.toBeInstanceOf(ApiTimeoutError);
    expect(error).not.toBeInstanceOf(ApiError);
    // The sole caller walked away, so the (shared) request is aborted.
    const init = fetchSpy.mock.calls[0][1] as RequestInit;
    expect((init.signal as AbortSignal).aborted).toBe(true);
  });

  it('rejects immediately without a network call when the signal is already aborted', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const controller = new AbortController();
    controller.abort();

    await expect(apiFetch('/x', { signal: controller.signal })).rejects.toSatisfy(isAbortError);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('treats only caller cancellations as aborts — timeouts and ApiErrors are real failures', () => {
    expect(isAbortError(new ApiTimeoutError('t', '/t', 1))).toBe(false);
    expect(isAbortError(new ApiError('nope', 500))).toBe(false);
    expect(isAbortError(new DOMException('The operation was aborted.', 'AbortError'))).toBe(true);
    expect(isAbortError(new Error('boom'))).toBe(false);
  });
});

describe('GET de-duplication', () => {
  it('shares one network request and one result between identical concurrent GETs', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const { promise, settle } = deferredResponse();
    fetchSpy.mockReturnValue(promise);

    const first = apiFetch('/things', { accessToken: 'token' });
    const second = apiFetch('/things', { accessToken: 'token' });
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    settle(jsonResponse(200, [{ id: '1' }]));
    await expect(first).resolves.toEqual([{ id: '1' }]);
    await expect(second).resolves.toEqual([{ id: '1' }]);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('never shares a request across different tokens', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const first = deferredResponse();
    const second = deferredResponse();
    fetchSpy.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);

    const a = apiFetch('/things', { accessToken: 'a' });
    const b = apiFetch('/things', { accessToken: 'b' });
    expect(fetchSpy).toHaveBeenCalledTimes(2);

    first.settle(jsonResponse(200, { who: 'a' }));
    second.settle(jsonResponse(200, { who: 'b' }));
    await expect(a).resolves.toEqual({ who: 'a' });
    await expect(b).resolves.toEqual({ who: 'b' });
  });

  it('never de-duplicates mutations, even identical concurrent ones', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const first = deferredResponse();
    const second = deferredResponse();
    fetchSpy.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);

    const a = apiFetch('/things', { method: 'POST', body: { n: 1 }, accessToken: 'token' });
    const b = apiFetch('/things', { method: 'POST', body: { n: 1 }, accessToken: 'token' });
    expect(fetchSpy).toHaveBeenCalledTimes(2);

    first.settle(jsonResponse(200, { id: 'a' }));
    second.settle(jsonResponse(200, { id: 'b' }));
    await expect(a).resolves.toEqual({ id: 'a' });
    await expect(b).resolves.toEqual({ id: 'b' });
  });

  it('lets one caller cancel without cancelling the shared request for the others', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const { promise, settle } = deferredResponse();
    fetchSpy.mockReturnValue(promise);

    const firstController = new AbortController();
    const secondController = new AbortController();
    const first = apiFetch('/things', { accessToken: 'token', signal: firstController.signal });
    const second = apiFetch('/things', { accessToken: 'token', signal: secondController.signal });
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    firstController.abort();
    await expect(first).rejects.toSatisfy(isAbortError);

    const sharedSignal = (fetchSpy.mock.calls[0][1] as RequestInit).signal as AbortSignal;
    expect(sharedSignal.aborted).toBe(false);

    settle(jsonResponse(200, { ok: true }));
    await expect(second).resolves.toEqual({ ok: true });
  });

  it('aborts the shared request once its last caller walks away', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    fetchSpy.mockImplementation(() => new Promise<Response>(() => {}));

    const firstController = new AbortController();
    const secondController = new AbortController();
    const first = apiFetch('/things', { accessToken: 'token', signal: firstController.signal });
    const second = apiFetch('/things', { accessToken: 'token', signal: secondController.signal });

    firstController.abort();
    await expect(first).rejects.toSatisfy(isAbortError);
    const sharedSignal = (fetchSpy.mock.calls[0][1] as RequestInit).signal as AbortSignal;
    expect(sharedSignal.aborted).toBe(false);

    secondController.abort();
    await expect(second).rejects.toSatisfy(isAbortError);
    expect(sharedSignal.aborted).toBe(true);
  });

  it('caches a failure for the other waiters instead of issuing a second request', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const { promise, settle } = deferredResponse();
    fetchSpy.mockReturnValue(promise);

    const first = apiFetch('/things');
    const second = apiFetch('/things');
    settle(jsonResponse(409, { message: 'Conflict' }));

    await expect(first).rejects.toMatchObject({ status: 409, message: 'Conflict' });
    await expect(second).rejects.toMatchObject({ status: 409, message: 'Conflict' });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});

describe('error mapping (regression)', () => {
  it('maps non-2xx JSON to ApiError with the envelope message', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(404, { message: 'No such thing' }));
    await expect(apiFetch('/missing')).rejects.toMatchObject({
      name: 'ApiError',
      status: 404,
      message: 'No such thing',
    });
  });

  it('returns the parsed body on success', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(200, { hello: 'world' }));
    await expect(apiFetch('/ok')).resolves.toEqual({ hello: 'world' });
  });

  it('keeps blob downloads working', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(new Blob(['file-bytes']), { status: 200 }),
    );

    const blob = await apiFetchBlob('/file', { accessToken: 'token' });
    expect(await blob.text()).toBe('file-bytes');
  });
});

describe('multipart uploads (apiFetchForm)', () => {
  it('sends the FormData without a Content-Type header so the boundary stays intact', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(200, { id: '1' }));

    const form = new FormData();
    form.append('file', new Blob(['bytes']), 'result.pdf');
    await expect(apiFetchForm('/upload', form, { accessToken: 'token' })).resolves.toEqual({ id: '1' });

    const init = fetchSpy.mock.calls[0][1] as RequestInit;
    expect(init.method).toBe('POST');
    expect(init.body).toBe(form);
    const headers = init.headers as Record<string, string>;
    expect(headers['Content-Type']).toBeUndefined();
    expect(headers.Authorization).toBe('Bearer token');
  });

  it('applies the timeout to uploads too', async () => {
    vi.useFakeTimers();
    hungFetch();

    const attempt = apiFetchForm('/upload', new FormData(), { timeoutMs: 750 });
    const assertion = expect(attempt).rejects.toBeInstanceOf(ApiTimeoutError);
    await vi.advanceTimersByTimeAsync(751);
    await assertion;
  });

  it('never de-duplicates concurrent uploads', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const first = deferredResponse();
    const second = deferredResponse();
    fetchSpy.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);

    const a = apiFetchForm('/upload', new FormData(), { accessToken: 'token' });
    const b = apiFetchForm('/upload', new FormData(), { accessToken: 'token' });
    expect(fetchSpy).toHaveBeenCalledTimes(2);

    first.settle(jsonResponse(200, { id: 'a' }));
    second.settle(jsonResponse(200, { id: 'b' }));
    await expect(a).resolves.toEqual({ id: 'a' });
    await expect(b).resolves.toEqual({ id: 'b' });
  });

  it('cancels an upload when the caller signal aborts', async () => {
    abortableHungFetch();
    const controller = new AbortController();

    const attempt = apiFetchForm('/upload', new FormData(), { signal: controller.signal });
    const assertion = expect(attempt).rejects.toSatisfy(isAbortError);
    controller.abort();
    await assertion;
  });
});

const patient: User = {
  id: 'user-1',
  email: 'patient@example.com',
  role: 'patient',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

function jsonBody(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

// Session recovery (issue #9). These tests stub `fetch` (rather than
// spyOn) because the refresh/retry paths are easier to assert with a
// scripted sequence of responses.
describe('session recovery (issue #9)', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    clearCsrfToken();
    useAuthStore.setState({ user: null, accessToken: null, csrfToken: null, status: 'idle' });
  });

  describe('bootstrapSession', () => {
    it('restores the session from the refresh cookie on boot', async () => {
      fetchMock.mockResolvedValueOnce(
        jsonBody({ user: patient, accessToken: 'fresh-token', csrfToken: 'csrf-1' }),
      );

      await bootstrapSession();

      const state = useAuthStore.getState();
      expect(state.user).toEqual(patient);
      expect(state.accessToken).toBe('fresh-token');
      expect(state.csrfToken).toBe('csrf-1');
      expect(state.status).toBe('resolved');

      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toContain('/auth/refresh');
      expect(init.method).toBe('POST');
      expect(init.credentials).toBe('include');
    });

    it('stays signed out when the refresh cookie is rejected', async () => {
      fetchMock.mockResolvedValueOnce(jsonBody({ message: 'No refresh token provided.' }, 401));

      await bootstrapSession();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.accessToken).toBeNull();
      expect(state.status).toBe('resolved');
    });

    it('marks the check resolved even when the network is down', async () => {
      fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));

      await bootstrapSession();

      expect(useAuthStore.getState().status).toBe('resolved');
      expect(useAuthStore.getState().user).toBeNull();
    });
  });

  describe('single-flight refresh + retry on 401', () => {
    it('refreshes once and retries the original request with the new token', async () => {
      useAuthStore.getState().setSession(patient, 'expired-token', 'csrf-1');

      fetchMock
        .mockResolvedValueOnce(jsonBody({ message: 'expired' }, 401))
        .mockResolvedValueOnce(
          jsonBody({ user: patient, accessToken: 'fresh-token', csrfToken: 'csrf-2' }),
        )
        .mockResolvedValueOnce(jsonBody({ ok: true }));

      await expect(apiFetch('/payments/intents', { accessToken: 'expired-token' })).resolves.toEqual({
        ok: true,
      });
      expect(fetchMock).toHaveBeenCalledTimes(3);

      const retryInit = fetchMock.mock.calls[2][1];
      expect(retryInit.headers.Authorization).toBe('Bearer fresh-token');
      expect(useAuthStore.getState().accessToken).toBe('fresh-token');
    });

    it('shares one refresh across concurrent 401s', async () => {
      useAuthStore.getState().setSession(patient, 'expired-token', 'csrf-1');

      let refreshCalls = 0;
      // Every first attempt 401s, every retry succeeds. Implemented with a
      // per-token decision so URL-based routing above stays simple.
      fetchMock.mockImplementation(async (url: string, init: RequestInit) => {
        if (url.endsWith('/auth/refresh')) {
          refreshCalls += 1;
          await new Promise((resolve) => setTimeout(resolve, 5));
          return jsonBody({ user: patient, accessToken: 'fresh-token', csrfToken: 'csrf-2' });
        }
        const authorization = (init.headers as Record<string, string>).Authorization;
        if (authorization === 'Bearer expired-token') {
          return jsonBody({ message: 'expired' }, 401);
        }
        return jsonBody({ ok: true });
      });

      await Promise.all([
        apiFetch('/appointments/mine', { accessToken: 'expired-token' }),
        apiFetch('/payments/intents', { accessToken: 'expired-token' }),
        apiFetch('/notifications', { accessToken: 'expired-token' }),
      ]);

      expect(refreshCalls).toBe(1);
    });

    it('clears the session when the refresh also fails', async () => {
      useAuthStore.getState().setSession(patient, 'expired-token', 'csrf-1');

      fetchMock
        .mockResolvedValueOnce(jsonBody({ message: 'expired' }, 401))
        .mockResolvedValueOnce(jsonBody({ message: 'No refresh token provided.' }, 401));

      await expect(
        apiFetch('/appointments/mine', { accessToken: 'expired-token' }),
      ).rejects.toMatchObject({ status: 401 });
      expect(useAuthStore.getState().user).toBeNull();
      expect(useAuthStore.getState().accessToken).toBeNull();
    });

    it('does not recurse when the refresh itself 401s', async () => {
      useAuthStore.getState().setSession(patient, 'expired-token', 'csrf-1');
      fetchMock.mockResolvedValue(jsonBody({ message: 'No refresh token provided.' }, 401));

      await expect(refreshSession()).resolves.toBeNull();
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('retries de-duplicated GETs after one shared refresh', async () => {
      useAuthStore.getState().setSession(patient, 'expired-token', 'csrf-1');

      let refreshCalls = 0;
      let expiredCalls = 0;
      fetchMock.mockImplementation(async (url: string, init: RequestInit) => {
        if (url.endsWith('/auth/refresh')) {
          refreshCalls += 1;
          return jsonBody({ user: patient, accessToken: 'fresh-token', csrfToken: 'csrf-2' });
        }
        const authorization = (init.headers as Record<string, string>).Authorization;
        if (authorization === 'Bearer expired-token') {
          expiredCalls += 1;
          return jsonBody({ message: 'expired' }, 401);
        }
        return jsonBody({ ok: true });
      });

      // Both callers share the 401 response (one network attempt), then
      // share the retried request as well.
      await Promise.all([
        apiFetch('/appointments/mine', { accessToken: 'expired-token' }),
        apiFetch('/appointments/mine', { accessToken: 'expired-token' }),
      ]);

      expect(expiredCalls).toBe(1);
      expect(refreshCalls).toBe(1);
    });

    it('does not refresh unauthenticated requests', async () => {
      fetchMock.mockResolvedValueOnce(jsonBody({ message: 'Not signed in' }, 401));

      await expect(apiFetch('/public')).rejects.toMatchObject({ status: 401 });
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });
});
