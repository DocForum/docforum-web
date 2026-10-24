import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useOptimisticMutation } from '../../../hooks/useOptimisticMutation';
import * as messagingService from '../../../services/messaging-service';
import { useAuthStore } from '../../../store/auth-store';
import { messageKeys } from '../../../query-keys';
import type { ListThreadsInput } from '../../../services/messaging-service';
import type { DoctorMessageThread } from '../../../types/models';

export function useMessageThreads(input: ListThreadsInput) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const queryKey = messageKeys.threads(input.filter, input.cursor, input.limit);

  const query = useQuery({
    queryKey,
    queryFn: ({ signal }) => messagingService.listThreads(input, accessToken!, signal),
    enabled: Boolean(accessToken),
    placeholderData: (previous) => previous,
  });

  const fetchMore = useCallback(async (): Promise<ListThreadsResult | null> => {
    if (!query.data?.nextCursor || query.isFetching) return null;
    return messagingService.listThreads(
      { ...input, cursor: query.data.nextCursor },
      accessToken!,
    );
  }, [query.data?.nextCursor, query.isFetching, input, accessToken]);

  const markRead = useOptimisticMutation<
    void,
    Error,
    string,
    { threads: DoctorMessageThread[]; nextCursor: string | null }
  >({
    mutationFn: (threadId: string) =>
      messagingService.markThreadRead(threadId, accessToken!),
    queryKey,
    // Example of the optimistic helper's non-money use: the unread badge
    // clears the moment the doctor opens a thread.
    update: (old, threadId) => {
      if (!old) return old;
      return {
        ...old,
        threads: old.threads.map((thread) =>
          thread.id === threadId ? { ...thread, unreadCount: 0 } : thread,
        ),
      };
    },
    errorMessage: "Couldn't mark that thread as read.",
    // A read receipt has no richer server state to reconcile.
    invalidateOnSettle: false,
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
