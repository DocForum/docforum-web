import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as referralsService from '../../../services/admin-referrals-service';
import { ApiError } from '../../../services/api-client';
import { useAuthStore } from '../../../store/auth-store';
import type { StuckAge } from '../../../services/admin-referrals-service';
import type { CancelReferralInput, ReassignReferralInput } from '../../../types/models';

const STUCK_KEY = ['admin', 'referrals', 'stuck'] as const;

// A 4xx won't fix itself on retry — only retry network/5xx failures.
function shouldRetry(failureCount: number, error: Error): boolean {
  if (error instanceof ApiError && error.status < 500) return false;
  return failureCount < 1;
}

export function useStuckReferrals(olderThan: StuckAge) {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useInfiniteQuery({
    queryKey: [...STUCK_KEY, olderThan],
    queryFn: ({ pageParam, signal }) =>
      referralsService.listStuckReferrals({ olderThan, cursor: pageParam }, accessToken!, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: Boolean(accessToken),
    retry: shouldRetry,
  });
}

/** Availability moves quickly, so this always refetches when the picker opens. */
export function useReassignCandidates(specialtyId: string) {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: ['admin', 'referrals', 'candidates', specialtyId],
    queryFn: ({ signal }) => referralsService.listReassignCandidates(specialtyId, accessToken!, signal),
    enabled: Boolean(accessToken && specialtyId),
    staleTime: 0,
    refetchOnMount: 'always',
    retry: shouldRetry,
  });
}

// Whatever happened — success, or a 409/404 telling us the referral moved
// on — the queue we're showing is out of date. A network failure leaves it
// alone: we don't know the outcome, and a retry will find out.
function isSettledOnServer(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 409 || error.status === 404);
}

export function useReassignReferral() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ referralId, input }: { referralId: string; input: ReassignReferralInput }) =>
      referralsService.reassignReferral(referralId, input, accessToken!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: STUCK_KEY }),
    onError: (error) => {
      if (isSettledOnServer(error)) return queryClient.invalidateQueries({ queryKey: STUCK_KEY });
      // A 422 usually means the chosen doctor stopped being eligible.
      if (error instanceof ApiError && error.status === 422) {
        return queryClient.invalidateQueries({ queryKey: ['admin', 'referrals', 'candidates'] });
      }
    },
  });
}

export function useCancelReferral() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ referralId, input }: { referralId: string; input: CancelReferralInput }) =>
      referralsService.cancelReferral(referralId, input, accessToken!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: STUCK_KEY }),
    onError: (error) => {
      if (isSettledOnServer(error)) return queryClient.invalidateQueries({ queryKey: STUCK_KEY });
    },
  });
}
