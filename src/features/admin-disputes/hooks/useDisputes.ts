import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as disputesService from '../../../services/admin-disputes-service';
import { ApiError } from '../../../services/api-client';
import { useAuthStore } from '../../../store/auth-store';
import type { ResolveDisputeInput } from '../../../types/models';

const OPEN_DISPUTES_KEY = ['admin', 'disputes', 'open'] as const;
const disputeDetailKey = (disputeId: string) => ['admin', 'disputes', 'detail', disputeId] as const;

// A 4xx won't fix itself on retry — only retry network/5xx failures.
function shouldRetry(failureCount: number, error: Error): boolean {
  if (error instanceof ApiError && error.status < 500) return false;
  return failureCount < 1;
}

export function useOpenDisputes() {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useInfiniteQuery({
    queryKey: OPEN_DISPUTES_KEY,
    queryFn: ({ pageParam, signal }) =>
      disputesService.listOpenDisputes(pageParam, accessToken!, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: Boolean(accessToken),
    retry: shouldRetry,
  });
}

export function useDispute(disputeId: string) {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: disputeDetailKey(disputeId),
    queryFn: ({ signal }) => disputesService.getDispute(disputeId, accessToken!, signal),
    enabled: Boolean(accessToken && disputeId),
    retry: shouldRetry,
  });
}

/** Mints one short-lived URL per call. Deliberately a mutation, not a query:
 * it must run again every time the admin opens the attachment, and nothing
 * should cache the result. */
export function useAttachmentUrl() {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useMutation({
    mutationFn: ({ disputeId, attachmentId }: { disputeId: string; attachmentId: string }) =>
      disputesService.createAttachmentUrl(disputeId, attachmentId, accessToken!),
  });
}

function settledOnServer(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 409 || error.status === 404);
}

export function useResolveDispute(disputeId: string) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ResolveDisputeInput) =>
      disputesService.resolveDispute(disputeId, input, accessToken!),
    onSuccess: (detail) => {
      // The server's response is authoritative — show the resolved state at
      // once and drop the dispute from the open queue.
      queryClient.setQueryData(disputeDetailKey(detail.id), detail);
      queryClient.invalidateQueries({ queryKey: OPEN_DISPUTES_KEY });
    },
    onError: (error) => {
      // Someone else got there first: the copy on screen is out of date.
      if (settledOnServer(error)) {
        queryClient.invalidateQueries({ queryKey: OPEN_DISPUTES_KEY });
        queryClient.invalidateQueries({ queryKey: disputeDetailKey(disputeId) });
      }
    },
  });
}
