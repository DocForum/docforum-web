import { useAuthStore } from '../store/auth-store';
import { NOTIFICATIONS_PAGE_SIZE } from '../services/notifications-service';
import { NotificationList } from '../features/notifications/components/NotificationList';
import { useNotifications } from '../features/notifications/hooks/useNotifications';
import { useNotificationLiveUpdates } from '../features/notifications/hooks/useNotificationLiveUpdates';
import styles from './NotificationsPage.module.css';

/**
 * Full notification inbox (issue #107). The header bell is the quick view; this
 * page is where the cursor-paginated history lives, with the same rows, deep
 * links and mark-as-read behaviour.
 */
export function NotificationsPage() {
  const user = useAuthStore((state) => state.user);
  const role = user?.role ?? null;
  const inbox = useNotifications({ enabled: Boolean(user) });
  useNotificationLiveUpdates(Boolean(user), NOTIFICATIONS_PAGE_SIZE);

  return (
    <div className={styles.page}>
      <p className={styles.intro}>
        Bookings, referrals, orders, results, messages and payment updates for your account.
        Unread items are highlighted.
      </p>
      <NotificationList
        notifications={inbox.notifications}
        role={role}
        isLoading={inbox.isLoading}
        error={inbox.error}
        onRetry={() => void inbox.refetch()}
        hasMore={inbox.hasMore}
        isFetchingMore={inbox.isFetchingMore}
        onLoadMore={() => void inbox.fetchMore()}
        onMarkRead={(notificationId) => inbox.markRead.mutate(notificationId)}
        onMarkAllRead={() => inbox.markAllRead.mutate()}
        unreadCount={inbox.unreadCount}
        isMarkingAll={inbox.markAllRead.isPending}
        variant="page"
      />
    </div>
  );
}
