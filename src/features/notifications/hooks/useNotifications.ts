import { useCallback } from 'react';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as notificationsService from '../../../services/notifications-service';
import { NOTIFICATIONS_PAGE_SIZE } from '../../../services/notifications-service';
import { useAuthStore } from '../../../store/auth-store';
import { notificationKeys } from '../../../query-keys';
import type { NotificationPages } from '../notifications-cache';
import {
  markAllRead,
  markOneRead,
  notificationsFrom,
  unreadCountFrom,
} from '../notifications-cache';
import { broadcastNotification } from '../notifications-channel';

export interface UseNotificationsOptions {
  /** Only fetch while the bell (or page) is actually visible. */
  enabled?: boolean;
  limit?: number;
}

/**
 * The notification inbox (issue #107): newest page first, cursor-paginated,
 * with optimistic mark-one/mark-all. The badge reads the server's `unreadCount`
 * from the newest page, never a count of loaded rows, so it stays correct
 * before every page has been fetched.
 */
export function useNotifications({ enabled = true, limit = NOTIFICATIONS_PAGE_SIZE }: UseNotificationsOptions = {}) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();
  const queryKey = notificationKeys.list(limit);
  const active = enabled && Boolean(accessToken);

  const query = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam, signal }) =>
      notificationsService.listNotifications(
        { cursor: pageParam ?? null, limit },
        accessToken!,
        signal,
      ),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: active,
    // The SSE stream is the primary update path; this poll is the fallback for
    // environments where EventSource is blocked by a proxy.
    refetchInterval: active ? 60_000 : false,
    refetchOnWindowFocus: true,
  });

  const markRead = useMutation({
    mutationFn: (notificationId: string) =>
      notificationsService.markNotificationRead(notificationId, accessToken!),
    onMutate: async (notificationId) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<NotificationPages>(queryKey);
      const next = markOneRead(previous, notificationId, new Date().toISOString());
      if (next) queryClient.setQueryData(queryKey, next);
      if (next) {
        broadcastNotification({
          type: 'read',
          notificationIds: [notificationId],
          unreadCount: unreadCountFrom(next),
        });
      }
      return { previous };
    },
    onError: (_error, _id, context) => {
      // Roll back to exactly what the user saw before the optimistic write.
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
    },
    onSuccess: (updated, notificationId) => {
      const current = queryClient.getQueryData<NotificationPages>(queryKey);
      if (updated?.readAt) {
        queryClient.setQueryData(
          queryKey,
          markOneRead(current, notificationId, updated.readAt),
        );
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey });
    },
  });

  const markAll = useMutation({
    mutationFn: () => notificationsService.markAllNotificationsRead(accessToken!),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<NotificationPages>(queryKey);
      const next = markAllRead(previous, new Date().toISOString());
      if (next) queryClient.setQueryData(queryKey, next);
      broadcastNotification({
        type: 'read',
        notificationIds: notificationsFrom(next).map((item) => item.id),
        unreadCount: 0,
      });
      return { previous };
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey });
    },
  });

  const fetchMore = useCallback(async () => {
    if (!query.hasNextPage || query.isFetchingNextPage) return;
    await query.fetchNextPage();
  }, [query]);

  const notifications = notificationsFrom(query.data);
  const unreadCount = unreadCountFrom(query.data);

  return {
    notifications,
    unreadCount,
    hasMore: Boolean(query.hasNextPage),
    isLoading: query.isPending,
    isFetching: query.isFetching,
    isFetchingMore: query.isFetchingNextPage,
    error: query.error,
    refetch: query.refetch,
    fetchMore,
    markRead,
    markAllRead: markAll,
    queryKey,
  };
}
