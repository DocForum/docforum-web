import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as referralService from '../../../services/referral-service';
import { useAuthStore } from '../../../store/auth-store';
import { pendingReferralKeys } from '../../../query-keys';
import { invalidateFor } from '../../../invalidations';

export function usePendingReferrals() {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: pendingReferralKeys.all,
    queryFn: ({ signal }) => referralService.listPendingReferrals(accessToken!, signal),
    enabled: Boolean(accessToken),
  });
}

export function useAcceptReferral() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (referralId: string) => referralService.acceptReferral(referralId, accessToken!),
    onSuccess: () => invalidateFor(queryClient, 'referrals.accept'),
  });
}

export function useDeclineReferral() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (referralId: string) => referralService.declineReferral(referralId, accessToken!),
    onSuccess: () => invalidateFor(queryClient, 'referrals.decline'),
  });
}
