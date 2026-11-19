import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '../../../store/auth-store';
import { ApiError } from '../../../services/api-client';
import * as queueService from '../../../services/queue-service';
import { useVisitActions, UNDO_WINDOW_MS } from './useQueue';
import { appointmentKeys, queueKeys } from '../../../query-keys';
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
    queryClient.setQueryData(queueKeys.today(), [
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
        queryClient.getQueryData(queueKeys.today()) as QueueEntry[]
      )?.[0].status,
    ).toBe('in_progress');

    result.current.undo('appt-1');
    expect(vi.mocked(queueService.startVisit)).not.toHaveBeenCalled();
    expect(
      (
        queryClient.getQueryData(queueKeys.today()) as QueueEntry[]
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
        queryClient.getQueryData(queueKeys.today()) as QueueEntry[]
      )?.[0].status,
    ).toBe('completed');

    result.current.undo('appt-1');
    expect(vi.mocked(queueService.completeVisit)).not.toHaveBeenCalled();
    expect(
      (
        queryClient.getQueryData(queueKeys.today()) as QueueEntry[]
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

  it('refreshes the dashboard appointment list and the queue once the start is confirmed', async () => {
    const { wrapper, queryClient } = makeWrapper();
    seedCache(queryClient, 'checked_in');
    queryClient.setQueryData(appointmentKeys.today(), [{ id: 'appt-1' }]);

    const { result } = renderHook(() => useVisitActions(), { wrapper });

    result.current.startVisit('appt-1');
    await vi.advanceTimersByTimeAsync(UNDO_WINDOW_MS);

    await vi.waitFor(() => {
      expect(
        queryClient.getQueryState(appointmentKeys.today())?.isInvalidated,
      ).toBe(true);
      expect(queryClient.getQueryState(queueKeys.today())?.isInvalidated).toBe(true);
    });
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

  function statusOf(queryClient: QueryClient): QueueEntry['status'] | undefined {
    return (queryClient.getQueryData(queueKeys.today()) as QueueEntry[] | undefined)?.[0].status;
  }

  it('rolls the optimistic start back when docforum-core rejects it with a 409', async () => {
    const { wrapper, queryClient } = makeWrapper();
    seedCache(queryClient, 'checked_in');
    vi.mocked(queueService.startVisit).mockRejectedValue(
      new ApiError('this visit is not checked in', 409),
    );

    const { result } = renderHook(() => useVisitActions(), { wrapper });

    result.current.startVisit('appt-1');
    expect(statusOf(queryClient)).toBe('in_progress');

    await vi.advanceTimersByTimeAsync(UNDO_WINDOW_MS);

    await vi.waitFor(() => expect(statusOf(queryClient)).toBe('checked_in'));
    // The server is the source of truth after a rejection.
    expect(queryClient.getQueryState(queueKeys.today())?.isInvalidated).toBe(true);
    expect(result.current.startError).toBeInstanceOf(ApiError);
  });

  it('rolls the optimistic completion back to in progress on a 409', async () => {
    const { wrapper, queryClient } = makeWrapper();
    seedCache(queryClient, 'in_progress');
    vi.mocked(queueService.completeVisit).mockRejectedValue(
      new ApiError('this visit is already completed', 409),
    );

    const { result } = renderHook(() => useVisitActions(), { wrapper });

    result.current.completeVisit('appt-1');
    expect(statusOf(queryClient)).toBe('completed');

    await vi.advanceTimersByTimeAsync(UNDO_WINDOW_MS);

    await vi.waitFor(() => expect(statusOf(queryClient)).toBe('in_progress'));
  });

  it('sends one PATCH when start is tapped twice inside the undo window', async () => {
    const { wrapper, queryClient } = makeWrapper();
    seedCache(queryClient, 'checked_in');

    const { result } = renderHook(() => useVisitActions(), { wrapper });

    result.current.startVisit('appt-1');
    result.current.startVisit('appt-1');

    await vi.advanceTimersByTimeAsync(UNDO_WINDOW_MS);

    expect(vi.mocked(queueService.startVisit)).toHaveBeenCalledTimes(1);
    expect(statusOf(queryClient)).toBe('in_progress');
  });

  it('does not send a second PATCH when undo arrives after the window elapsed', async () => {
    const { wrapper, queryClient } = makeWrapper();
    seedCache(queryClient, 'checked_in');

    const { result } = renderHook(() => useVisitActions(), { wrapper });

    result.current.startVisit('appt-1');
    await vi.advanceTimersByTimeAsync(UNDO_WINDOW_MS);
    expect(vi.mocked(queueService.startVisit)).toHaveBeenCalledTimes(1);

    // The deferred call already left; reversing it would need a second,
    // conflicting PATCH, so undo is a no-op and the optimistic state stands.
    result.current.undo('appt-1');
    await vi.advanceTimersByTimeAsync(UNDO_WINDOW_MS);

    expect(vi.mocked(queueService.startVisit)).toHaveBeenCalledTimes(1);
    expect(statusOf(queryClient)).toBe('in_progress');
  });

  it('ignores complete while the start PATCH is still in flight', async () => {
    const { wrapper, queryClient } = makeWrapper();
    seedCache(queryClient, 'checked_in');
    // Never settles: the start has been sent but not acknowledged, so the
    // server's status is still unknown.
    vi.mocked(queueService.startVisit).mockReturnValue(new Promise<never>(() => {}));

    const { result } = renderHook(() => useVisitActions(), { wrapper });

    result.current.startVisit('appt-1');
    await vi.advanceTimersByTimeAsync(UNDO_WINDOW_MS);
    expect(vi.mocked(queueService.startVisit)).toHaveBeenCalledTimes(1);

    result.current.completeVisit('appt-1');
    await vi.advanceTimersByTimeAsync(UNDO_WINDOW_MS);

    expect(vi.mocked(queueService.completeVisit)).not.toHaveBeenCalled();
  });
});
