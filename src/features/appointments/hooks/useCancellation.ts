import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as appointmentsService from '../../../services/appointments-service';
import { useAuthStore } from '../../../store/auth-store';
import { invalidateFor } from '../../../invalidations';
import { appointmentKeys } from '../../../query-keys';
import type { CancelAppointmentInput, CancelledAppointment } from '../../../types/models';

/**
 * The per-appointment cancellation policy. The dialog will not promise a slot
 * release without it, so a failed read disables cancelling rather than falling
 * back to a guessed cutoff.
 */
export function useCancellationPolicy(appointmentId: string, enabled = true) {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: appointmentKeys.cancellationPolicy(appointmentId),
    queryFn: ({ signal }) => appointmentsService.getCancellationPolicy(appointmentId, accessToken!, signal),
    enabled: Boolean(accessToken && appointmentId && enabled),
    staleTime: 60_000,
  });
}

export function useCancelAppointment(appointmentId: string) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();

  return useMutation<CancelledAppointment, Error, CancelAppointmentInput>({
    mutationFn: (input) => appointmentsService.cancelAppointment(appointmentId, input, accessToken!),
    onSuccess: async (updated) => {
      // Show the server's answer immediately, then reconcile every list the
      // appointment appears in (dashboard "coming up", detail).
      if (updated?.id) {
        queryClient.setQueryData(appointmentKeys.detail(appointmentId), updated);
      }
      await invalidateFor(queryClient, 'appointment.cancel', appointmentId);
    },
  });
}
