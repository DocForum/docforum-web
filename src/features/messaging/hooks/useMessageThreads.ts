import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as messagingService from '../../../services/messaging-service';
import { useAuthStore } from '../../../store/auth-store';
import type { ListThreadsInput } from '../../../services/messaging-service';
import type { MessageThread } from '../../../types/models';

const THREADS_KEY = ['doctor', 'messages', 'threads'] as const;

export function useMessageThreads(input: ListThreadsInput) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();
  const queryKey = [...THREADS_KEY, input.filter, input.cursor, input.limit];

  const query = useQuery({
    queryKey,
    queryFn: () => messagingService.listThreads(input, accessToken!),
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

  const markRead = useMutation({
    mutationFn: (threadId: string) =>
      messagingService.markThreadRead(threadId, accessToken!),
    onSuccess: (_: unknown, threadId: string) => {
      queryClient.setQueryData<{ threads: MessageThread[]; nextCursor: string | null } | undefined>(
        queryKey,
        (old) => {
          if (!old) return old;
          return {
            ...old,
            threads: old.threads.map((t: MessageThread) =>
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

export type ListThreadsResult = { threads: MessageThread[]; nextCursor: string | null };
