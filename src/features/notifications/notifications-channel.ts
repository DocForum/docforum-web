// Cross-tab consistency for the unread badge (issue #107).
//
// Two tabs signed into the same account each hold their own React Query cache,
// and SSE delivers to both — but marking a notification read in one tab must
// also clear the badge in the other, and the server-pushed event is not
// guaranteed to arrive before the user looks. A BroadcastChannel makes the two
// tabs agree immediately; the stream and the next refetch are still the source
// of truth.
//
// No notification content is broadcast beyond what the other tab already has:
// `read` carries ids only, `notification` carries the same PHI-light payload
// the server would push to that tab anyway.
import type { Notification } from '../../types/models';

const CHANNEL_NAME = 'docforum-notifications';

export type NotificationBroadcast =
  | { type: 'notification'; notification: Notification; unreadCount: number }
  | { type: 'read'; notificationIds: string[]; unreadCount: number };

function createChannel(): BroadcastChannel | null {
  if (typeof BroadcastChannel === 'undefined') return null;
  try {
    return new BroadcastChannel(CHANNEL_NAME);
  } catch {
    // Some privacy modes disable BroadcastChannel; live updates still work.
    return null;
  }
}

/** Tell other tabs about a change. Best-effort: never throws. */
export function broadcastNotification(change: NotificationBroadcast): void {
  const channel = createChannel();
  if (!channel) return;
  try {
    channel.postMessage(change);
  } finally {
    channel.close();
  }
}

/** Listen for changes made in other tabs. Returns an unsubscribe function. */
export function subscribeToNotificationChanges(
  handler: (change: NotificationBroadcast) => void,
): () => void {
  const channel = createChannel();
  if (!channel) return () => {};

  const listener = (event: MessageEvent<NotificationBroadcast>) => {
    const change = event.data;
    if (!change || typeof change !== 'object') return;
    if (change.type !== 'notification' && change.type !== 'read') return;
    handler(change);
  };

  channel.addEventListener('message', listener);
  return () => {
    channel.removeEventListener('message', listener);
    channel.close();
  };
}
