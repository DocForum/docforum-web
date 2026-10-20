import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useAppointmentQueue } from './useAppointmentQueue';
import * as appointmentsService from '../../../services/appointments-service';
import { useAuthStore } from '../../../store/auth-store';
import type { AppointmentQueue } from '../../../types/models';

vi.mock('../../../services/appointments-service');

const POLL_MS = 20;

const QUEUE: AppointmentQueue = {
  appointmentId: 'apt-1',
  phase: 'waiting',
  peopleAhead: 4,
  estimatedWaitMinutes: 18,
  checkInOpensAt: null,
  checkedInAt: '2026-10-16T09:30:00Z',
};

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('useAppointmentQueue', () => {
  beforeEach(() => {
    useAuthStore.setState({ accessToken: 'test-token', user: null });
    vi.mocked(appointmentsService.getAppointmentQueue).mockReset();
  });

  it('keeps re-reading the queue while it is on screen', async () => {
    vi.mocked(appointmentsService.getAppointmentQueue).mockResolvedValue(QUEUE);

    renderHook(() => useAppointmentQueue('apt-1', true, POLL_MS), { wrapper });

    await waitFor(() => expect(vi.mocked(appointmentsService.getAppointmentQueue).mock.calls.length).toBeGreaterThan(2));
  });

  // The review criterion for #32: leaving the page must stop live updates.
  it('stops polling as soon as the queue is no longer mounted', async () => {
    const read = vi.mocked(appointmentsService.getAppointmentQueue).mockResolvedValue(QUEUE);

    const { unmount } = renderHook(() => useAppointmentQueue('apt-1', true, POLL_MS), { wrapper });

    await waitFor(() => expect(read.mock.calls.length).toBeGreaterThan(1));
    unmount();

    const callsAfterUnmount = read.mock.calls.length;
    await new Promise((resolve) => setTimeout(resolve, POLL_MS * 6));
    expect(read.mock.calls.length).toBe(callsAfterUnmount);
  });

  it('never polls for a visit that is not happening today', async () => {
    const read = vi.mocked(appointmentsService.getAppointmentQueue).mockResolvedValue(QUEUE);

    renderHook(() => useAppointmentQueue('apt-1', false, POLL_MS), { wrapper });

    await waitFor(() => expect(read).toHaveBeenCalledTimes(1));
    // act() around the wait: the fetch's final state update lands while the
    // hook is still mounted, and React must see it inside an act scope.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, POLL_MS * 6));
    });
    expect(read.mock.calls.length).toBe(1);
  });

  it('does not ask for a queue without a session', async () => {
    useAuthStore.setState({ accessToken: null });
    const read = vi.mocked(appointmentsService.getAppointmentQueue).mockResolvedValue(QUEUE);

    const { result } = renderHook(() => useAppointmentQueue('apt-1', true, POLL_MS), { wrapper });

    await new Promise((resolve) => setTimeout(resolve, POLL_MS * 3));
    expect(read).not.toHaveBeenCalled();
    // A disabled query is idle, not "loading" — the page must be able to tell
    // the two apart instead of spinning forever.
    expect(result.current.isFetching).toBe(false);
  });
});
