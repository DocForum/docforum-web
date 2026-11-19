import { useCallback, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as queueService from '../../../services/queue-service';
import { useAuthStore } from '../../../store/auth-store';
import { invalidateFor } from '../../../invalidations';
import { appointmentKeys, queueKeys } from '../../../query-keys';
import type { QueueEntry } from '../../../types/models';

const APPOINTMENTS_KEY = appointmentKeys.today();
const QUEUE_KEY = queueKeys.today();
const RUNNING_DELAY_KEY = queueKeys.runningDelay();

// How long an action can be undone after it's tapped.
export const UNDO_WINDOW_MS = 4000;

type VisitStatus = QueueEntry['status'];

interface PendingAction {
  timer: ReturnType<typeof setTimeout>;
  /** Status before the optimistic change, restored on undo or failure. */
  previousStatus: VisitStatus;
  /** What the optimistic change set, so a rollback never clobbers newer state. */
  appliedStatus: VisitStatus;
}

/**
 * Today's appointments. The backend scopes the day from the doctor's practice
 * time zone (issue #236), so this hook sends no date and computes no boundary
 * locally — a doctor near midnight sees the server's day, not the browser's.
 */
export function useAppointments() {
  const accessToken = useAuthStore((state) => state.accessToken);
  return useQuery({
    queryKey: APPOINTMENTS_KEY,
    queryFn: ({ signal }) => queueService.listTodayAppointments(accessToken!, signal),
    enabled: Boolean(accessToken),
  });
}

export function useQueue() {
  const accessToken = useAuthStore((state) => state.accessToken);
  // Refetch periodically so newly checked-in patients appear live.
  return useQuery({
    queryKey: QUEUE_KEY,
    queryFn: ({ signal }) => queueService.listQueue(accessToken!, signal),
    enabled: Boolean(accessToken),
    refetchInterval: 30000,
  });
}

export function useRunningDelay() {
  const accessToken = useAuthStore((state) => state.accessToken);
  return useQuery({
    queryKey: RUNNING_DELAY_KEY,
    queryFn: ({ signal }) => queueService.getRunningDelay(accessToken!, signal),
    enabled: Boolean(accessToken),
    refetchInterval: 30000,
  });
}

export function useUpdateRunningDelay() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { manualOverrideMin: number | null }) =>
      queueService.updateRunningDelay(input, accessToken!),
    onSuccess: () => invalidateFor(queryClient, 'queue.running-delay'),
  });
}

/**
 * Start/complete visits with optimistic UI and an undo window.
 *
 * Tapping start/complete applies the optimistic change immediately and
 * defers the real PATCH by UNDO_WINDOW_MS. `undo(id)` cancels the deferred
 * call and reverts the optimistic UI, so nothing reaches the server unless
 * the window elapses.
 *
 * Failures roll the optimistic row back and refetch, so a `409` (not
 * scheduled / not checked in / not in progress) never leaves the queue
 * showing a state the server rejected. A second action for the same
 * appointment while one is still pending is ignored, so the undo window can
 * never produce two conflicting PATCHes.
 */
export function useVisitActions() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();
  const pending = useRef<Map<string, PendingAction>>(new Map());
  const sent = useRef<Set<string>>(new Set());

  const applyOptimistic = useCallback(
    (id: string, status: VisitStatus) => {
      queryClient.setQueryData(QUEUE_KEY, (old: QueueEntry[] | undefined) => {
        if (!old) return old;
        return old.map((e) => (e.appointmentId === id ? { ...e, status } : e));
      });
    },
    [queryClient],
  );

  /**
   * Put the row back only if it still shows the optimistic value: a poll or a
   * newer action may already have written something else.
   */
  const rollback = useCallback(
    (id: string, appliedStatus: VisitStatus, previousStatus: VisitStatus) => {
      queryClient.setQueryData(QUEUE_KEY, (old: QueueEntry[] | undefined) => {
        if (!old) return old;
        return old.map((e) =>
          e.appointmentId === id && e.status === appliedStatus
            ? { ...e, status: previousStatus }
            : e,
        );
      });
      sent.current.delete(id);
      // The server is the source of truth after a rejection.
      invalidateFor(queryClient, 'queue.visit-action');
    },
    [queryClient],
  );

  const startMutation = useMutation({
    mutationFn: (id: string) => queueService.startVisit(id, accessToken!),
    // The optimistic row lands instantly; once the server agrees, the
    // appointment list above the queue (and a non-observed queue copy) must
    // converge on the same status too.
    onSuccess: (_appointment, id) => {
      sent.current.delete(id);
      invalidateFor(queryClient, 'queue.visit-action');
    },
    onError: (_error, id) => rollback(id, 'in_progress', 'checked_in'),
  });
  const completeMutation = useMutation({
    mutationFn: (id: string) => queueService.completeVisit(id, accessToken!),
    onSuccess: (_appointment, id) => {
      sent.current.delete(id);
      invalidateFor(queryClient, 'queue.visit-action');
    },
    onError: (_error, id) => rollback(id, 'completed', 'in_progress'),
  });

  const clearPending = useCallback((id: string) => {
    const action = pending.current.get(id);
    if (action) {
      clearTimeout(action.timer);
      pending.current.delete(id);
    }
  }, []);

  const schedule = useCallback(
    (id: string, previousStatus: VisitStatus, appliedStatus: VisitStatus, send: (id: string) => void) => {
      // One deferred write per appointment: a repeated tap must not queue a
      // second, conflicting PATCH or orphan the first timer.
      if (pending.current.has(id) || sent.current.has(id)) return;

      clearPending(id);
      applyOptimistic(id, appliedStatus);

      const timer = setTimeout(() => {
        pending.current.delete(id);
        sent.current.add(id);
        send(id);
      }, UNDO_WINDOW_MS);
      pending.current.set(id, { timer, previousStatus, appliedStatus });
    },
    [applyOptimistic, clearPending],
  );

  const startVisit = useCallback(
    (id: string) => {
      const entry = findQueueEntry(queryClient.getQueryData<QueueEntry[]>(QUEUE_KEY), id);
      if (!entry || entry.status !== 'checked_in') return;
      schedule(id, entry.status, 'in_progress', (appointmentId) =>
        startMutation.mutate(appointmentId),
      );
    },
    [queryClient, schedule, startMutation],
  );

  const completeVisit = useCallback(
    (id: string) => {
      const entry = findQueueEntry(queryClient.getQueryData<QueueEntry[]>(QUEUE_KEY), id);
      if (!entry || entry.status !== 'in_progress') return;
      schedule(id, entry.status, 'completed', (appointmentId) =>
        completeMutation.mutate(appointmentId),
      );
    },
    [queryClient, schedule, completeMutation],
  );

  const undo = useCallback(
    (id: string) => {
      const action = pending.current.get(id);
      // Once the deferred PATCH has been sent there is nothing safe to undo:
      // reversing it would need a second, conflicting PATCH.
      if (!action) return;

      clearPending(id);
      rollback(id, action.appliedStatus, action.previousStatus);
      startMutation.reset();
      completeMutation.reset();
    },
    [clearPending, rollback, startMutation, completeMutation],
  );

  const hasPendingUndo = pending.current.size > 0;
  const isPending = startMutation.isPending || completeMutation.isPending;

  return {
    startVisit,
    completeVisit,
    undo,
    isPending,
    hasPendingUndo,
    startError: startMutation.error,
    completeError: completeMutation.error,
  };
}

function findQueueEntry(entries: QueueEntry[] | undefined, appointmentId: string) {
  return entries?.find((e) => e.appointmentId === appointmentId);
}
