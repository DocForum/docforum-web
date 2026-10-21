import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as followupService from '../../../services/followup-service';
import { useAuthStore } from '../../../store/auth-store';
import { followUpKeys } from '../../../query-keys';
import { invalidateFor } from '../../../invalidations';

export function useFollowUpRequests() {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: followUpKeys.mine(),
    queryFn: ({ signal }) => followupService.listMyFollowUpRequests(accessToken!, signal),
    enabled: Boolean(accessToken),
  });
}

export function useBookFollowUp() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { followUpRequestId: string; slotId: string }) =>
      followupService.bookFollowUp(input, accessToken!),
    onSuccess: () => invalidateFor(queryClient, 'followup.book'),
  });
}
