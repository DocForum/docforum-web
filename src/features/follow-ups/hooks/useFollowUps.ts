import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { appointmentKeys, followUpKeys } from '../../../query-keys';
import { useAuthStore } from '../../../store/auth-store';
import * as appointmentsService from '../../../services/appointments-service';
import * as followUpsService from '../../../services/follow-ups-service';

export function useMyFollowUps() {
  const accessToken = useAuthStore((state) => state.accessToken);
  return useQuery({
    queryKey: followUpKeys.mine(),
    queryFn: ({ signal }) => followUpsService.listMyFollowUps(accessToken!, undefined, signal),
    enabled: Boolean(accessToken),
  });
}

export function useFollowUpSlots(followUpId: string, doctorProfileId: string, enabled: boolean) {
  return useQuery({
    queryKey: followUpKeys.slots(followUpId, doctorProfileId),
    queryFn: () => appointmentsService.getOpenSlots(doctorProfileId),
    enabled,
  });
}

export function useBookFollowUp() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ followUpId, availabilitySlotId }: { followUpId: string; availabilitySlotId: string }) =>
      followUpsService.bookFollowUp(followUpId, availabilitySlotId, accessToken!),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: followUpKeys.all }),
        queryClient.invalidateQueries({ queryKey: appointmentKeys.all }),
      ]);
    },
    onError: async () => {
      await queryClient.invalidateQueries({ queryKey: followUpKeys.mine() });
    },
  });
}
