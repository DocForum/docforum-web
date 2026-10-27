import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as verificationService from '../../../services/admin-verification-service';
import { ApiError } from '../../../services/api-client';
import { useAuthStore } from '../../../store/auth-store';
import type { ClaimAge } from '../../../services/admin-verification-service';
import type { ReviewSpecialtyClaimInput } from '../../../types/models';

const CLAIMS_KEY = ['admin', 'specialty-verifications'] as const;

// A 4xx won't fix itself on retry — only retry network/5xx failures.
function shouldRetry(failureCount: number, error: Error): boolean {
  if (error instanceof ApiError && error.status < 500) return false;
  return failureCount < 1;
}

export function useSpecialtyClaims(specialtyId: string, olderThan: ClaimAge | null) {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useInfiniteQuery({
    queryKey: [...CLAIMS_KEY, specialtyId, olderThan],
    queryFn: ({ pageParam, signal }) =>
      verificationService.listSpecialtyClaims({ specialtyId: specialtyId || null, olderThan, cursor: pageParam }, accessToken!, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: Boolean(accessToken),
    retry: shouldRetry,
  });
}

/** Specialty catalog for the filter dropdown. A 404 (docforum-core#23 not
 * landed) just means the dropdown falls back to the loaded claims. */
export function useSpecialtyCatalog() {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: ['admin', 'specialty-verifications', 'specialties'],
    queryFn: ({ signal }) => verificationService.listSpecialties(accessToken!, signal),
    enabled: Boolean(accessToken),
    retry: shouldRetry,
  });
}

// Whatever happened — success, a conflict, or a refusal — the queue we're
// showing may be out of date (a conflict means someone else acted). Invalidating
// on settle covers all of them; a plain retry is still safe because the request
// carries `expectedUpdatedAt`, so a duplicate comes back as a conflict.
export function useReviewSpecialtyClaim() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ claimId, input }: { claimId: string; input: ReviewSpecialtyClaimInput }) =>
      verificationService.reviewSpecialtyClaim(claimId, input, accessToken!),
    onSettled: () => queryClient.invalidateQueries({ queryKey: CLAIMS_KEY }),
  });
}
