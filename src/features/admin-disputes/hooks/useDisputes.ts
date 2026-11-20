import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as disputesService from '../../../services/disputes-service';
import { ApiError } from '../../../services/api-client';
import { useAuthStore } from '../../../store/auth-store';
import type { ResolveDisputeInput } from '../../../types/models';

const DISPUTES_KEY = ['admin', 'disputes'] as const;

function shouldRetry(failureCount: number, error: Error): boolean {
  // A 4xx won't fix itself on retry — only retry network/5xx failures.
  if (error instanceof ApiError && error.status < 500) return false;
  return failureCount < 1;
}

export function useOpenDisputes() {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useInfiniteQuery({
    queryKey: [...DISPUTES_KEY, 'open'],
    queryFn: ({ pageParam, signal }) =>
      disputesService.listDisputes({ status: 'open', cursor: pageParam }, accessToken!, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: Boolean(accessToken),
    retry: shouldRetry,
  });
}

export function useDispute(disputeId: string | undefined) {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: [...DISPUTES_KEY, 'detail', disputeId],
    queryFn: ({ signal }) => disputesService.getDispute(disputeId!, accessToken!, signal),
    enabled: Boolean(accessToken && disputeId),
    retry: shouldRetry,
  });
}

/**
 * Final resolution. A success updates the cached detail (so the page shows
 * the resolved state immediately) and invalidates the open queue. Conflicts
 * (409/404) also invalidate the detail and queue: another admin resolved it
 * first and the screen the admin is looking at is stale.
 */
export function useResolveDispute(disputeId: string) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ResolveDisputeInput) => disputesService.resolveDispute(disputeId, input, accessToken!),
    onSuccess: (dispute) => {
      queryClient.setQueryData([...DISPUTES_KEY, 'detail', disputeId], dispute);
      return queryClient.invalidateQueries({ queryKey: [...DISPUTES_KEY, 'open'] });
    },
    onError: (error) => {
      if (error instanceof ApiError && (error.status === 409 || error.status === 404)) {
        void queryClient.invalidateQueries({ queryKey: [...DISPUTES_KEY, 'detail', disputeId] });
        return queryClient.invalidateQueries({ queryKey: [...DISPUTES_KEY, 'open'] });
      }
      return undefined;
    },
  });
}

/**
 * Signed attachment URLs are minted per click and deliberately kept out of
 * the query cache — there is no stored URL anywhere in the model or UI.
 */
export function useAttachmentUrl(disputeId: string) {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useMutation({
    mutationFn: (attachmentId: string) =>
      disputesService.getAttachmentSignedUrl(disputeId, attachmentId, accessToken!),
  });
}
