// The atomic reschedule mutation (issue #14 / docforum-core#55).
//
// Cache policy is the load-bearing part of this file:
//
//  SUCCESS  invalidate the list AND the detail — the patient must see the new
//           time everywhere, and the slot they just took must leave the picker.
//  409      the backend's swap is all-or-nothing, so the appointment did not
//           move. The list and detail caches are deliberately left alone (no
//           invalidation, no removal, no optimistic delete) so the original
//           appointment stays on screen exactly as it was; only the slot list
//           is refreshed, because that is the one thing that did change.
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as appointmentsService from '../../../services/appointments-service';
import { useAuthStore } from '../../../store/auth-store';
import { isSlotTaken } from '../errors';
import { APPOINTMENTS_KEY, appointmentsKeys } from './useAppointments';

export interface RescheduleInput {
  newSlotId: string;
}

export function useReschedule(appointmentId: string) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ newSlotId }: RescheduleInput) =>
      appointmentsService.rescheduleAppointment(appointmentId, newSlotId, accessToken!),

    onSuccess: async (updated) => {
      // The server just handed back the authoritative row — show it at once
      // rather than waiting out the refetch, then reconcile via invalidation.
      if (updated?.id && updated.availabilitySlot) {
        queryClient.setQueryData(appointmentsKeys.detail(appointmentId), updated);
      }
      // `APPOINTMENTS_KEY` is the list the page and the care hub actually read
      // (main moved `useMyAppointments` onto it); `appointmentsKeys.list` stays
      // covered so nothing keyed there goes stale either.
      await queryClient.invalidateQueries({ queryKey: APPOINTMENTS_KEY });
      await queryClient.invalidateQueries({ queryKey: appointmentsKeys.list });
      await queryClient.invalidateQueries({ queryKey: appointmentsKeys.detail(appointmentId) });
      await queryClient.invalidateQueries({ queryKey: appointmentsKeys.slotsRoot });
    },

    onError: async (error) => {
      if (!isSlotTaken(error)) return;
      // 409 → the original appointment is untouched: no list/detail
      // invalidation here, only a refresh of the picker's slots.
      await queryClient.invalidateQueries({ queryKey: appointmentsKeys.slotsRoot });
    },
  });
}
