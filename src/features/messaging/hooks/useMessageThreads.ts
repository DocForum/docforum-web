import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as messagingService from '../../../services/messaging-service';
import { useAuthStore } from '../../../store/auth-store';
import { messageKeys } from '../../../query-keys';
import type { ListThreadsInput } from '../../../services/messaging-service';
import type { DoctorMessageThread } from '../../../types/models';

export function useMessageThreads(
  input: ListThreadsInput,
  options: { enabled?: boolean } = {},
) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();
  const queryKey = messageKeys.threads(input.filter, input.cursor, input.limit);

  const query = useQuery({
    queryKey,
    queryFn: ({ signal }) => messagingService.listThreads(input, accessToken!, signal),
    enabled: Boolean(accessToken) && (options.enabled ?? true),
    placeholderData: (previous) => previous,
  });

  const fetchMore = useCallback(async (): Promise<ListThreadsResult | null> => {
    if (!query.data?.nextCursor || query.isFetching) return null;
    return messagingService.listThreads(
      { ...input, cursor: query.data.nextCursor },
      accessToken!,
    );
  }, [query.data?.nextCursor, query.isFetching, input, accessToken]);

  const markRead = useMutation({
    mutationFn: (threadId: string) =>
      messagingService.markThreadRead(threadId, accessToken!),
    onSuccess: (_: unknown, threadId: string) => {
      queryClient.setQueryData<{ threads: DoctorMessageThread[]; nextCursor: string | null } | undefined>(
        queryKey,
        (old) => {
          if (!old) return old;
          return {
            ...old,
            threads: old.threads.map((t: DoctorMessageThread) =>
              t.id === threadId ? { ...t, unreadCount: 0 } : t,
            ),
          };
        },
      );
    },
  });

  const threads = query.data?.threads ?? [];
  const totalUnread = messagingService.totalUnread(threads);
  const hasMore = Boolean(query.data?.nextCursor);

  return {
    threads,
    totalUnread,
    hasMore,
    nextCursor: query.data?.nextCursor ?? null,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    markRead,
    fetchMore,
    refetch: query.refetch,
  };
}

export type ListThreadsResult = { threads: DoctorMessageThread[]; nextCursor: string | null };

/**
 * Unread message count for the Messages nav badge (issue #235). It reads the
 * same query `DoctorInbox` uses, so `useRealtimeCacheSync`'s `message.created`
 * invalidation refreshes the badge without a reload, and there is exactly one
 * source of truth for the count.
 */
export function useUnreadMessageCount(enabled: boolean): number {
  const { totalUnread } = useMessageThreads(
    { filter: 'all', cursor: null, limit: 10 },
    { enabled },
  );
  return totalUnread;
}
