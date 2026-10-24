import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useDeferredAction } from '../../../hooks/useDeferredAction';
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
 * defers the real API call by UNDO_WINDOW_MS. `undo(id)` cancels the
 * deferred call and reverts the optimistic UI, so nothing reaches the
 * server unless the window elapses. The undo offer rides the shared toast
 * system (with a real Undo button), and a failed call rolls the row back.
 */
export function useVisitActions() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();

  const startMutation = useMutation({
    mutationFn: (id: string) => queueService.startVisit(id, accessToken!),
    // The optimistic row lands instantly; once the server agrees, the
    // appointment list above the queue (and a non-observed queue copy) must
    // converge on the same status too.
    onSuccess: () => invalidateFor(queryClient, 'queue.visit-action'),
  });
  const completeMutation = useMutation({
    mutationFn: (id: string) => queueService.completeVisit(id, accessToken!),
    onSuccess: () => invalidateFor(queryClient, 'queue.visit-action'),
  });

  const deferred = useDeferredAction(UNDO_WINDOW_MS);

  const applyOptimistic = useCallback(
    (id: string, status: 'checked_in' | 'in_progress' | 'completed') => {
      queryClient.setQueryData(QUEUE_KEY, (old: QueueEntry[] | undefined) => {
        if (!old) return old;
        return old.map((entry) => (entry.appointmentId === id ? { ...entry, status } : entry));
      });
    },
    [queryClient],
  );

  const startVisit = useCallback(
    (id: string) => {
      const entry = findQueueEntry(queryClient.getQueryData<QueueEntry[]>(QUEUE_KEY), id);
      if (!entry || entry.status !== 'checked_in') return;

      deferred.run({
        id,
        apply: () => applyOptimistic(id, 'in_progress'),
        undo: () => applyOptimistic(id, 'checked_in'),
        commit: () => startMutation.mutateAsync(id),
        appliedMessage: `${entry.fullName} marked as started.`,
        successMessage: `${entry.fullName} started.`,
        errorMessage: `Couldn't start ${entry.fullName}'s visit. The queue has been restored.`,
      });
    },
    [applyOptimistic, deferred, queryClient, startMutation],
  );

  const completeVisit = useCallback(
    (id: string) => {
      const entry = findQueueEntry(queryClient.getQueryData<QueueEntry[]>(QUEUE_KEY), id);
      if (!entry || entry.status !== 'in_progress') return;

      deferred.run({
        id,
        apply: () => applyOptimistic(id, 'completed'),
        undo: () => applyOptimistic(id, 'in_progress'),
        commit: () => completeMutation.mutateAsync(id),
        appliedMessage: `${entry.fullName}'s visit marked as completed.`,
        successMessage: `${entry.fullName}'s visit completed.`,
        errorMessage: `Couldn't complete ${entry.fullName}'s visit. The queue has been restored.`,
      });
    },
    [applyOptimistic, deferred, queryClient, completeMutation],
  );

  return {
    startVisit,
    completeVisit,
    undo: deferred.undo,
    isPending: startMutation.isPending || completeMutation.isPending,
    hasPendingUndo: deferred.hasPending(),
    startError: startMutation.error,
    completeError: completeMutation.error,
  };
}

function findQueueEntry(
  entries: QueueEntry[] | undefined,
  appointmentId: string,
) {
  return entries?.find((e) => e.appointmentId === appointmentId);
}
