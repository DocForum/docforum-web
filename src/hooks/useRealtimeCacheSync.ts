import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useServerEvent } from './useServerEvents';
import { useFlag } from '../features/feature-flags/hooks/useFlags';
import { useAuthStore } from '../store/auth-store';
import { eventStreamManager } from '../services/event-stream-service';

/**
 * Bridges typed SSE events into React Query (issue #109): a notification
 * refresh invalidates the notification caches, a queue event refetches the
 * doctor queue, a new message refetches inbox threads, and admin alerts
 * refetch admin data. Invalidating (rather than hand-patching) keeps the
 * cache authoritative without guessing at payload shapes.
 */
export function useRealtimeCacheSync(): void {
  const queryClient = useQueryClient();
  const accessToken = useAuthStore((state) => state.accessToken);
  const userId = useAuthStore((state) => state.user?.id);
  const enabled = useFlag('realtime_updates') && Boolean(accessToken);

  // A different account must not inherit the previous account's
  // Last-Event-ID cursor.
  useEffect(() => {
    eventStreamManager.clearReplay();
    return () => eventStreamManager.clearReplay();
  }, [userId]);

  useServerEvent(
    'notification.created',
    () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
      void queryClient.invalidateQueries({ queryKey: ['doctor', 'messages'] });
    },
    { enabled },
  );

  useServerEvent(
    'queue.updated',
    () => {
      void queryClient.invalidateQueries({ queryKey: ['doctor', 'queue'] });
      void queryClient.invalidateQueries({ queryKey: ['doctor', 'appointments'] });
    },
    { enabled },
  );

  useServerEvent(
    'message.created',
    () => {
      void queryClient.invalidateQueries({ queryKey: ['doctor', 'messages'] });
    },
    { enabled },
  );

  useServerEvent(
    'admin.alert',
    () => {
      void queryClient.invalidateQueries({ queryKey: ['admin'] });
    },
    { enabled },
  );
}
