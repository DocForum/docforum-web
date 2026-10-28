import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { apiUrl } from '../../../services/api-client';
import { getNotificationStreamTicket } from '../../../services/notifications-service';
import { useAuthStore } from '../../../store/auth-store';
import { notificationKeys } from '../../../query-keys';
import type { NotificationPages } from '../notifications-cache';
import { applyStreamEvent, parseStreamEvent } from '../notifications-cache';
import { subscribeToNotificationChanges } from '../notifications-channel';

/** Reconnect at most this many times before giving up until the next mount.
 * EventSource retries forever on its own, which would hammer a backend that is
 * genuinely down (or a proxy that blocks streams). */
const MAX_RECONNECTS = 2;
const RECONNECT_DELAY_MS = 10_000;

/**
 * Live inbox updates (issue #107): an SSE stream for the signed-in user plus
 * the cross-tab BroadcastChannel, both applied to the same React Query cache.
 *
 * Failure is never user-facing: a dropped stream leaves the polling fallback
 * in `useNotifications` (60 s) in charge, and the bell keeps working. The
 * stream URL carries a single-use ticket, never the access token — see
 * `getNotificationStreamTicket`.
 */
export function useNotificationLiveUpdates(enabled: boolean, limit: number) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) return undefined;

    const queryKey = notificationKeys.list(limit);
    const applyToCache = (raw: string) => {
      const event = parseStreamEvent(raw);
      if (!event) return;
      queryClient.setQueryData<NotificationPages>(queryKey, (current) =>
        applyStreamEvent(current, event),
      );
    };

    const unsubscribe = subscribeToNotificationChanges((change) => {
      queryClient.setQueryData<NotificationPages>(queryKey, (current) => {
        if (change.type === 'notification') {
          return applyStreamEvent(current, {
            type: 'notification',
            notification: change.notification,
            unreadCount: change.unreadCount,
          });
        }
        return applyStreamEvent(current, {
          type: 'read',
          notificationIds: change.notificationIds,
          unreadCount: change.unreadCount,
        });
      });
    });

    if (!accessToken || typeof EventSource === 'undefined') return unsubscribe;

    let closed = false;
    let source: EventSource | null = null;
    let reconnects = 0;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;

    const connect = async () => {
      try {
        const ticket = await getNotificationStreamTicket(accessToken);
        if (closed) return;

        source = new EventSource(apiUrl(ticket.streamPath));
        source.addEventListener('notification', (event) => {
          applyToCache((event as MessageEvent<string>).data);
        });
        source.addEventListener('read', (event) => {
          applyToCache((event as MessageEvent<string>).data);
        });
        source.addEventListener('error', () => {
          source?.close();
          source = null;
          if (closed || reconnects >= MAX_RECONNECTS) return;
          reconnects += 1;
          retryTimer = setTimeout(() => {
            void connect();
          }, RECONNECT_DELAY_MS * reconnects);
        });
        source.addEventListener('open', () => {
          reconnects = 0;
        });
      } catch {
        // No ticket (offline, endpoint not shipped, expired session): stay
        // quiet. The 60 s refetch in `useNotifications` keeps the bell honest.
      }
    };

    void connect();

    return () => {
      closed = true;
      unsubscribe();
      if (retryTimer) clearTimeout(retryTimer);
      source?.close();
    };
  }, [enabled, accessToken, limit, queryClient]);
}
