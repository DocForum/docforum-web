// Contract tests for the doctor queue endpoints (issue #236).
//
// docforum-core transitions a visit with PATCH and scopes "today" on the
// server, so these assertions pin the method and path the client sends. A
// future edit that reverts to POST (or computes a date client-side) fails
// here instead of only in a live environment.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { makeAppointment } from '../test/factories';
import { completeVisit, listTodayAppointments, startVisit } from './queue-service';

const APPOINTMENT = makeAppointment({ status: 'in_progress' });

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () =>
      new Response(JSON.stringify(APPOINTMENT), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    ),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function sentRequest(index = 0): { url: string; init: RequestInit } {
  const calls = vi.mocked(fetch).mock.calls;
  expect(calls.length).toBeGreaterThan(index);
  const [url, init] = calls[index];
  return { url: String(url), init: (init ?? {}) as RequestInit };
}

describe('queue service contract (#236)', () => {
  it('starts a visit with PATCH /appointments/{appointmentId}/start', async () => {
    await startVisit('appt 1', 'test-token');

    const { url, init } = sentRequest();
    expect(url).toMatch(/\/appointments\/appt%201\/start$/);
    expect(init.method).toBe('PATCH');
  });

  it('completes a visit with PATCH /appointments/{appointmentId}/complete', async () => {
    await completeVisit('appt-2', 'test-token');

    const { url, init } = sentRequest();
    expect(url).toMatch(/\/appointments\/appt-2\/complete$/);
    expect(init.method).toBe('PATCH');
  });

  it('reads today with GET /appointments/doctor/today and sends no client date', async () => {
    await listTodayAppointments('test-token');

    const { url, init } = sentRequest();
    expect(url).toMatch(/\/appointments\/doctor\/today$/);
    expect(init.method ?? 'GET').toBe('GET');
    // The server owns the day boundary (doctor's practice time zone).
    expect(url).not.toMatch(/[?&](date|from|to)=/);
  });
});
