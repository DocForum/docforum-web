// Issue #123: every query-serving service forwards the caller's
// AbortSignal into apiFetch, so React Query's cancellation actually stops
// the network request. These tests pin that wiring down for a sample
// across services, plus the slow-endpoint timeout override.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { listTodayAppointments, listQueue } from './queue-service';
import { listHealthEntries } from './health-profile-service';
import { requestDataExport } from './account-service';
import { listMyOrders } from './orders-service';
import { listFulfillmentQueue } from './fulfillment-service';
import { ApiTimeoutError } from './api-client';

function hungFetch() {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(() => new Promise<Response>(() => {}));
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('service signal wiring', () => {
  it('listTodayAppointments forwards the signal, and aborting it cancels the request', async () => {
    const fetchSpy = hungFetch();
    const controller = new AbortController();

    const attempt = listTodayAppointments('token', controller.signal);
    const assertion = expect(attempt).rejects.toMatchObject({ name: 'AbortError' });
    controller.abort();
    await assertion;

    const signal = (fetchSpy.mock.calls[0][1] as RequestInit).signal as AbortSignal;
    expect(signal.aborted).toBe(true);
  });

  it('listQueue forwards the signal', async () => {
    const fetchSpy = hungFetch();
    const controller = new AbortController();

    const attempt = listQueue('token', controller.signal);
    const assertion = expect(attempt).rejects.toMatchObject({ name: 'AbortError' });
    controller.abort();
    await assertion;
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('listHealthEntries forwards the signal', async () => {
    const fetchSpy = hungFetch();
    const controller = new AbortController();

    const attempt = listHealthEntries('profile-1', 'allergies', 'token', controller.signal);
    const assertion = expect(attempt).rejects.toMatchObject({ name: 'AbortError' });
    controller.abort();
    await assertion;
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('does not send a request at all when the caller signal is already aborted', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const controller = new AbortController();
    controller.abort();

    await expect(listTodayAppointments('token', controller.signal)).rejects.toMatchObject({ name: 'AbortError' });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  // Services that landed on `main` after this branch was cut still have to
  // join the same wiring, or navigating away from their screens leaks the
  // request.
  it('listMyOrders forwards the signal', async () => {
    const fetchSpy = hungFetch();
    const controller = new AbortController();

    const attempt = listMyOrders('token', controller.signal);
    const assertion = expect(attempt).rejects.toMatchObject({ name: 'AbortError' });
    controller.abort();
    await assertion;
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('listFulfillmentQueue forwards the signal', async () => {
    const fetchSpy = hungFetch();
    const controller = new AbortController();

    const attempt = listFulfillmentQueue('facility-1', 'token', controller.signal);
    const assertion = expect(attempt).rejects.toMatchObject({ name: 'AbortError' });
    controller.abort();
    await assertion;
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});

describe('slow-endpoint timeouts', () => {
  it('gives data-export creation the slow budget, not the default one', async () => {
    vi.useFakeTimers();
    hungFetch();

    const attempt = requestDataExport('correct-horse', 'token');
    const assertion = expect(attempt).rejects.toBeInstanceOf(ApiTimeoutError);
    let settled = false;
    void attempt.then(
      () => {
        settled = true;
      },
      () => {
        settled = true;
      },
    );

    // Past the default budget the request is still running…
    await vi.advanceTimersByTimeAsync(61_000);
    expect(settled).toBe(false);

    // …and it fails only once the slow budget elapses.
    await vi.advanceTimersByTimeAsync(59_001);
    await assertion;
    expect(settled).toBe(true);
    const error = await attempt.catch((e: unknown) => e);
    expect(error).toMatchObject({ timeoutMs: 120_000, path: '/account/data-export' });
  });
});
