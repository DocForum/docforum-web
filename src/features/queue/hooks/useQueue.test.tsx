import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '../../../store/auth-store';
import * as queueService from '../../../services/queue-service';
import { useVisitActions, UNDO_WINDOW_MS } from './useQueue';
import type { QueueEntry } from '../../../types/models';

vi.mock('../../../services/queue-service');

const QUEUE_ENTRY: QueueEntry = {
  appointmentId: 'appt-1',
  patientProfileId: 'pat-1',
  fullName: 'Ada Patient',
  checkedInAt: '2026-01-01T09:05:00Z',
  queuePosition: 1,
  status: 'checked_in',
};

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { wrapper, queryClient };
}

describe('useVisitActions', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useAuthStore.setState({ accessToken: 'test-token', user: null });
    vi.mocked(queueService.startVisit).mockReset();
    vi.mocked(queueService.completeVisit).mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function seedCache(queryClient: QueryClient, status: QueueEntry['status']) {
    queryClient.setQueryData(['doctor', 'queue', 'today'], [
      { ...QUEUE_ENTRY, status },
    ]);
  }

  it('applies start optimistically, defers the API call, and undoes within the window', () => {
    const { wrapper, queryClient } = makeWrapper();
    seedCache(queryClient, 'checked_in');

    const { result } = renderHook(() => useVisitActions(), { wrapper });

    result.current.startVisit('appt-1');
    expect(vi.mocked(queueService.startVisit)).not.toHaveBeenCalled();
    expect(
      (
        queryClient.getQueryData(['doctor', 'queue', 'today']) as QueueEntry[]
      )?.[0].status,
    ).toBe('in_progress');

    result.current.undo('appt-1');
    expect(vi.mocked(queueService.startVisit)).not.toHaveBeenCalled();
    expect(
      (
        queryClient.getQueryData(['doctor', 'queue', 'today']) as QueueEntry[]
      )?.[0].status,
    ).toBe('checked_in');
  });

  it('calls the start API once the undo window elapses', async () => {
    const { wrapper, queryClient } = makeWrapper();
    seedCache(queryClient, 'checked_in');

    const { result } = renderHook(() => useVisitActions(), { wrapper });

    result.current.startVisit('appt-1');
    vi.advanceTimersByTime(UNDO_WINDOW_MS);
    // mutate() invokes mutationFn on a microtask; flush it.
    await Promise.resolve();
    await Promise.resolve();
    expect(vi.mocked(queueService.startVisit)).toHaveBeenCalledWith('appt-1', 'test-token');
  });

  it('applies complete optimistically and undoes within the window', () => {
    const { wrapper, queryClient } = makeWrapper();
    seedCache(queryClient, 'in_progress');

    const { result } = renderHook(() => useVisitActions(), { wrapper });

    result.current.completeVisit('appt-1');
    expect(vi.mocked(queueService.completeVisit)).not.toHaveBeenCalled();
    expect(
      (
        queryClient.getQueryData(['doctor', 'queue', 'today']) as QueueEntry[]
      )?.[0].status,
    ).toBe('completed');

    result.current.undo('appt-1');
    expect(vi.mocked(queueService.completeVisit)).not.toHaveBeenCalled();
    expect(
      (
        queryClient.getQueryData(['doctor', 'queue', 'today']) as QueueEntry[]
      )?.[0].status,
    ).toBe('in_progress');
  });

  it('calls the complete API once the undo window elapses', async () => {
    const { wrapper, queryClient } = makeWrapper();
    seedCache(queryClient, 'in_progress');

    const { result } = renderHook(() => useVisitActions(), { wrapper });

    result.current.completeVisit('appt-1');
    vi.advanceTimersByTime(UNDO_WINDOW_MS);
    await Promise.resolve();
    await Promise.resolve();
    expect(vi.mocked(queueService.completeVisit)).toHaveBeenCalledWith('appt-1', 'test-token');
  });

  it('does not start a visit that is not checked in', () => {
    const { wrapper, queryClient } = makeWrapper();
    seedCache(queryClient, 'scheduled' as QueueEntry['status']);

    const { result } = renderHook(() => useVisitActions(), { wrapper });

    result.current.startVisit('appt-1');
    expect(vi.mocked(queueService.startVisit)).not.toHaveBeenCalled();
  });

  it('does not complete a visit that is not in progress', () => {
    const { wrapper, queryClient } = makeWrapper();
    seedCache(queryClient, 'checked_in');

    const { result } = renderHook(() => useVisitActions(), { wrapper });

    result.current.completeVisit('appt-1');
    expect(vi.mocked(queueService.completeVisit)).not.toHaveBeenCalled();
  });
});
