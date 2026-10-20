import { useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as appointmentsService from '../../../services/appointments-service';
import { useAuthStore } from '../../../store/auth-store';
import { useBrowserNotification } from '../../../hooks/useBrowserNotification';
import { notificationBody, queueSignature, shouldNotify } from '../queue';
import type { AppointmentQueue } from '../../../types/models';

export const QUEUE_POLL_INTERVAL_MS = 15_000;

function queueKey(appointmentId: string) {
  return ['appointments', appointmentId, 'queue'] as const;
}

export function useAppointmentQueue(appointmentId: string | undefined, poll: boolean, intervalMs = QUEUE_POLL_INTERVAL_MS) {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: queueKey(appointmentId ?? ''),
    queryFn: () => appointmentsService.getAppointmentQueue(appointmentId!, accessToken!),
    enabled: Boolean(accessToken && appointmentId),
    // The interval belongs to this observer: React Query clears it as soon as
    // the last component using the queue unmounts, and `gcTime: 0` means an
    // abandoned queue is dropped rather than kept warm for a later visit to
    // this page. Leaving the appointment page therefore stops live updates.
    refetchInterval: poll ? intervalMs : false,
    refetchIntervalInBackground: false,
    gcTime: 0,
  });
}

export function useCheckIn(appointmentId: string) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => appointmentsService.checkIn(appointmentId, accessToken!),
    onSuccess: (queue) => queryClient.setQueryData(queueKey(appointmentId), queue),
  });
}

/** Fires at most one notification per distinct queue state, and only while
 * the patient has both opted in and granted the browser permission. */
export function useQueueNotification(queue: AppointmentQueue | undefined, optedIn: boolean) {
  const notification = useBrowserNotification();
  const firedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!queue || !optedIn || !notification.canNotify) return;
    const signature = queueSignature(queue);
    if (firedFor.current === signature || !shouldNotify(queue)) return;
    firedFor.current = signature;
    notification.notify(notificationBody(queue));
  }, [queue, optedIn, notification]);

  return notification;
}
