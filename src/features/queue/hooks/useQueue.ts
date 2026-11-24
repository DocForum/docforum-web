import { useCallback, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as queueService from '../../../services/queue-service';
import type { AppointmentStatusUpdate } from '../../../services/queue-service';
import { ApiError } from '../../../services/api-client';
import { useAuthStore } from '../../../store/auth-store';
import { invalidateFor } from '../../../invalidations';
import { appointmentKeys, queueKeys } from '../../../query-keys';
import type { QueueEntry } from '../../../types/models';

const APPOINTMENTS_KEY = appointmentKeys.today();
const QUEUE_KEY = queueKeys.today();
const RUNNING_DELAY_KEY = queueKeys.runningDelay();
type VisitMutationVariables = {
  appointmentId: string;
  previousStatus: QueueEntry['status'];
  optimisticStatus: QueueEntry['status'];
};

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

/**
 * Mark a scheduled visit no-show or cancel it. docforum-core cascades to any
 * linked referral, so every screen that shows today's work is refreshed:
 * today's list, the live queue, and practice insights (no-show rates).
 */
export function useAppointmentStatusAction() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { appointmentId: string; status: AppointmentStatusUpdate }) =>
      queueService.updateAppointmentStatus(input.appointmentId, input.status, accessToken!),
    onSuccess: () => refreshToday(queryClient),
    onError: (error) => {
      // A 409 means someone else acted first; refresh so the row matches the
      // server instead of leaving a stale scheduled visit on screen.
      if (error instanceof ApiError && error.status === 409) refreshToday(queryClient);
    },
  });
}

function refreshToday(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: APPOINTMENTS_KEY });
  void queryClient.invalidateQueries({ queryKey: QUEUE_KEY });
  void queryClient.invalidateQueries({ queryKey: ['doctor', 'insights'] });
  void queryClient.invalidateQueries({ queryKey: ['appointments'] });
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
 * server unless the window elapses.
 */
export function useVisitActions() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();

  const pending = useRef<
    Map<
      string,
      {
        timer: ReturnType<typeof setTimeout>;
        previousStatus: QueueEntry['status'];
        optimisticStatus: QueueEntry['status'];
        action: 'start' | 'complete';
      }
    >
  >(new Map());
  const inFlight = useRef<Set<string>>(new Set());

  const applyOptimistic = useCallback(
    (id: string, status: QueueEntry['status']) => {
      queryClient.setQueryData(QUEUE_KEY, (old: QueueEntry[] | undefined) => {
        if (!old) return old;
        return old.map((e) =>
          e.appointmentId === id ? { ...e, status } : e,
        );
      });
    },
    [queryClient],
  );

  const rollback = useCallback(
    (id: string, optimisticStatus: QueueEntry['status'], previousStatus: QueueEntry['status']) => {
      queryClient.setQueryData(QUEUE_KEY, (old: QueueEntry[] | undefined) => {
        if (!old) return old;
        return old.map((entry) =>
          entry.appointmentId === id && entry.status === optimisticStatus
            ? { ...entry, status: previousStatus }
            : entry,
        );
      });
    },
    [queryClient],
  );

  const startMutation = useMutation({
    mutationFn: ({ appointmentId }: VisitMutationVariables) =>
      queueService.startVisit(appointmentId, accessToken!),
    // The optimistic row lands instantly; once the server agrees, the
    // appointment list above the queue (and a non-observed queue copy) must
    // converge on the same status too.
    onSuccess: () => invalidateFor(queryClient, 'queue.visit-action'),
    onError: (_error, variables) => {
      rollback(variables.appointmentId, variables.optimisticStatus, variables.previousStatus);
      return invalidateFor(queryClient, 'queue.visit-action');
    },
  });
  const completeMutation = useMutation({
    mutationFn: ({ appointmentId }: VisitMutationVariables) =>
      queueService.completeVisit(appointmentId, accessToken!),
    onSuccess: () => invalidateFor(queryClient, 'queue.visit-action'),
    onError: (_error, variables) => {
      rollback(variables.appointmentId, variables.optimisticStatus, variables.previousStatus);
      return invalidateFor(queryClient, 'queue.visit-action');
    },
  });

  const startVisit = useCallback(
    (id: string) => {
      if (pending.current.size > 0 || inFlight.current.size > 0) return;
      const entry = findQueueEntry(
        queryClient.getQueryData<QueueEntry[]>(QUEUE_KEY),
        id,
      );
      if (!entry || entry.status !== 'checked_in') return;

      startMutation.reset();
      completeMutation.reset();
      applyOptimistic(id, 'in_progress');

      const action = {
        timer: setTimeout(() => {
          pending.current.delete(id);
          inFlight.current.add(id);
          startMutation.mutate({
            appointmentId: id,
            previousStatus: entry.status,
            optimisticStatus: 'in_progress',
          }, {
            onSettled: () => inFlight.current.delete(id),
          });
        }, UNDO_WINDOW_MS),
        previousStatus: entry.status,
        optimisticStatus: 'in_progress' as const,
        action: 'start' as const,
      };
      pending.current.set(id, action);
    },
    [applyOptimistic, completeMutation, queryClient, startMutation],
  );

  const completeVisit = useCallback(
    (id: string) => {
      if (pending.current.size > 0 || inFlight.current.size > 0) return;
      const entry = findQueueEntry(
        queryClient.getQueryData<QueueEntry[]>(QUEUE_KEY),
        id,
      );
      if (!entry || entry.status !== 'in_progress') return;

      startMutation.reset();
      completeMutation.reset();
      applyOptimistic(id, 'completed');

      const action = {
        timer: setTimeout(() => {
          pending.current.delete(id);
          inFlight.current.add(id);
          completeMutation.mutate({
            appointmentId: id,
            previousStatus: entry.status,
            optimisticStatus: 'completed',
          }, {
            onSettled: () => inFlight.current.delete(id),
          });
        }, UNDO_WINDOW_MS),
        previousStatus: entry.status,
        optimisticStatus: 'completed' as const,
        action: 'complete' as const,
      };
      pending.current.set(id, action);
    },
    [applyOptimistic, completeMutation, queryClient, startMutation],
  );

  const undo = useCallback(
    (id: string) => {
      const action = pending.current.get(id);
      if (!action) return;
      clearTimeout(action.timer);
      pending.current.delete(id);
      rollback(id, action.optimisticStatus, action.previousStatus);
      if (action.action === 'start') startMutation.reset();
      else completeMutation.reset();
    },
    [rollback, startMutation, completeMutation],
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
