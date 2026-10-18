import { useCallback, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as queueService from '../../../services/queue-service';
import { useAuthStore } from '../../../store/auth-store';
import type { QueueEntry } from '../../../types/models';

const APPOINTMENTS_KEY = ['doctor', 'appointments', 'today'] as const;
const QUEUE_KEY = ['doctor', 'queue', 'today'] as const;
const RUNNING_DELAY_KEY = ['doctor', 'queue', 'running-delay'] as const;

// How long an action can be undone after it's tapped.
export const UNDO_WINDOW_MS = 4000;

export function useAppointments() {
  const accessToken = useAuthStore((state) => state.accessToken);
  return useQuery({
    queryKey: APPOINTMENTS_KEY,
    queryFn: () => queueService.listTodayAppointments(accessToken!),
    enabled: Boolean(accessToken),
  });
}

export function useQueue() {
  const accessToken = useAuthStore((state) => state.accessToken);
  // Refetch periodically so newly checked-in patients appear live.
  return useQuery({
    queryKey: QUEUE_KEY,
    queryFn: () => queueService.listQueue(accessToken!),
    enabled: Boolean(accessToken),
    refetchInterval: 30000,
  });
}

export function useRunningDelay() {
  const accessToken = useAuthStore((state) => state.accessToken);
  return useQuery({
    queryKey: RUNNING_DELAY_KEY,
    queryFn: () => queueService.getRunningDelay(accessToken!),
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
    onSuccess: (delay) => {
      queryClient.setQueryData(RUNNING_DELAY_KEY, delay);
    },
  });
}

/**
 * Start/complete visits with optimistic UI and an undo window.
 *
 * Tapping start/complete applies the optimistic change immediately and
 * defers the real API call by UNDO_WINDOW_MS. `undo(id)` cancels the
 * deferred call and reverts the optimistic UI, so nothing reaches the
 * server unless the window elapses.
 */
export function useVisitActions() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();

  const startMutation = useMutation({
    mutationFn: (id: string) => queueService.startVisit(id, accessToken!),
  });
  const completeMutation = useMutation({
    mutationFn: (id: string) => queueService.completeVisit(id, accessToken!),
  });

  const pending = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const applyOptimistic = useCallback(
    (id: string, status: 'checked_in' | 'in_progress' | 'completed') => {
      queryClient.setQueryData(QUEUE_KEY, (old: QueueEntry[] | undefined) => {
        if (!old) return old;
        return old.map((e) =>
          e.appointmentId === id ? { ...e, status } : e,
        );
      });
    },
    [queryClient],
  );

  const clearPending = useCallback((id: string) => {
    const timer = pending.current.get(id);
    if (timer) {
      clearTimeout(timer);
      pending.current.delete(id);
    }
  }, []);

  const startVisit = useCallback(
    (id: string) => {
      const entry = findQueueEntry(
        queryClient.getQueryData<QueueEntry[]>(QUEUE_KEY),
        id,
      );
      if (!entry || entry.status !== 'checked_in') return;

      applyOptimistic(id, 'in_progress');

      const timer = setTimeout(() => {
        pending.current.delete(id);
        startMutation.mutate(id);
      }, UNDO_WINDOW_MS);
      pending.current.set(id, timer);
    },
    [accessToken, applyOptimistic, queryClient, startMutation],
  );

  const completeVisit = useCallback(
    (id: string) => {
      const entry = findQueueEntry(
        queryClient.getQueryData<QueueEntry[]>(QUEUE_KEY),
        id,
      );
      if (!entry || entry.status !== 'in_progress') return;

      applyOptimistic(id, 'completed');

      const timer = setTimeout(() => {
        pending.current.delete(id);
        completeMutation.mutate(id);
      }, UNDO_WINDOW_MS);
      pending.current.set(id, timer);
    },
    [accessToken, applyOptimistic, queryClient, completeMutation],
  );

  const undo = useCallback(
    (id: string) => {
      clearPending(id);
      const entry = findQueueEntry(
        queryClient.getQueryData<QueueEntry[]>(QUEUE_KEY),
        id,
      );
      if (!entry) return;
      // Revert to the last known good status.
      if (entry.status === 'in_progress') {
        applyOptimistic(id, 'checked_in');
      } else if (entry.status === 'completed') {
        applyOptimistic(id, 'in_progress');
      }
      startMutation.reset();
      completeMutation.reset();
    },
    [clearPending, applyOptimistic, queryClient, startMutation, completeMutation],
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

function findQueueEntry(
  entries: QueueEntry[] | undefined,
  appointmentId: string,
) {
  return entries?.find((e) => e.appointmentId === appointmentId);
}
