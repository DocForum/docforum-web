import { useCallback } from 'react';
import { infiniteQueryOptions, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useOptimisticMutation } from '../../../hooks/useOptimisticMutation';
import { useUndoableAction } from '../../../hooks/useUndoableAction';
import { useT } from '../../../i18n/useT';
import * as notificationsService from '../../../services/notifications-service';
import { NOTIFICATIONS_PAGE_SIZE } from '../../../services/notifications-service';
import { useAuthStore } from '../../../store/auth-store';
import { notificationKeys } from '../../../query-keys';
import type { Notification } from '../../../types/models';
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

/** The inbox's first page: shared by `useNotifications` and the
 * /notifications route loader (#112), so both hit the same cache entry. */
export function notificationsQueryOptions(limit: number, accessToken: string | null) {
  return infiniteQueryOptions({
    queryKey: notificationKeys.list(limit),
    queryFn: ({ pageParam, signal }) =>
      notificationsService.listNotifications({ cursor: pageParam ?? null, limit }, accessToken!, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
}

/**
 * The notification inbox (issue #107): newest page first, cursor-paginated,
 * with optimistic mark-one and undoable mark-all (issue #113). The badge reads the server's `unreadCount`
 * from the newest page, never a count of loaded rows, so it stays correct
 * before every page has been fetched.
 */
export function useNotifications({ enabled = true, limit = NOTIFICATIONS_PAGE_SIZE }: UseNotificationsOptions = {}) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();
  const t = useT();
  const queryKey = notificationKeys.list(limit);
  const active = enabled && Boolean(accessToken);

  const query = useInfiniteQuery({
    ...notificationsQueryOptions(limit, accessToken),
    enabled: active,
    // The SSE stream is the primary update path; this poll is the fallback for
    // environments where EventSource is blocked by a proxy.
    refetchInterval: active ? 60_000 : false,
    refetchOnWindowFocus: true,
  });

  // Example 1 of the mutation feedback framework (issue #113): optimistic,
  // rolled back with an error toast if the server refuses.
  const markRead = useOptimisticMutation<Notification, string, NotificationPages>({
    queryKey,
    mutationFn: (notificationId) => notificationsService.markNotificationRead(notificationId, accessToken!),
    apply: (current, notificationId) => markOneRead(current, notificationId, new Date().toISOString()),
    onApplied: (next, notificationId) => {
      if (!next) return;
      broadcastNotification({
        type: 'read',
        notificationIds: [notificationId],
        unreadCount: unreadCountFrom(next),
      });
    },
    onSuccess: (updated, notificationId, client) => {
      if (!updated?.readAt) return;
      const current = client.getQueryData<NotificationPages>(queryKey);
      client.setQueryData(queryKey, markOneRead(current, notificationId, updated.readAt));
    },
    errorMessage: t(
      'notifications.markReadFailed',
      'Couldn’t mark that notification as read. It has been restored.',
    ),
  });

  // Example 2 (issue #113): "Mark all read" is one mis-click away from
  // wiping the inbox's unread state, and the API has no "mark unread", so
  // it is undoable by delayed commit — applied locally at once, sent to the
  // server only after the undo window. Other tabs hear about it on commit.
  const undoable = useUndoableAction();
  const markAll = {
    isPending: undoable.isPending,
    mutate: () => {
      undoable.run({
        message: t('notifications.markedAllRead', 'All notifications marked as read.'),
        undoLabel: t('notifications.undo', 'Undo'),
        undoneMessage: t('notifications.markAllUndone', 'Restored your unread notifications.'),
        errorMessage: t(
          'notifications.markAllFailed',
          'Couldn’t mark all notifications as read. They have been restored.',
        ),
        apply: () => {
          void queryClient.cancelQueries({ queryKey });
          const previous = queryClient.getQueryData<NotificationPages>(queryKey);
          const next = markAllRead(previous, new Date().toISOString());
          if (next) queryClient.setQueryData(queryKey, next);
          return () => {
            if (previous) queryClient.setQueryData(queryKey, previous);
          };
        },
        commit: async () => {
          try {
            await notificationsService.markAllNotificationsRead(accessToken!);
            broadcastNotification({
              type: 'read',
              notificationIds: notificationsFrom(queryClient.getQueryData<NotificationPages>(queryKey)).map(
                (item) => item.id,
              ),
              unreadCount: 0,
            });
          } finally {
            void queryClient.invalidateQueries({ queryKey });
          }
        },
      });
    },
  };

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
