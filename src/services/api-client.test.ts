import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  apiFetch,
  apiFetchBlob,
  apiFetchForm,
  ApiError,
  ApiTimeoutError,
  DEFAULT_TIMEOUT_MS,
  SLOW_REQUEST_TIMEOUT_MS,
  isAbortError,
} from './api-client';

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

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
  vi.useRealTimers();
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
