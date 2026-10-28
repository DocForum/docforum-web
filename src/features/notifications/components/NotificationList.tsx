import { Link } from 'react-router-dom';
import { Button } from '../../../components/Button';
import { EmptyState } from '../../../components/states/EmptyState';
import { InlineError } from '../../../components/states/InlineError';
import { Skeleton } from '../../../components/states/Skeleton';
import type { Notification, Role } from '../../../types/models';
import { notificationDestination, notificationMeta } from '../notification-meta';
import { formatNotificationTime, formatNotificationTimestamp } from '../notification-time';
import { NotificationIcon } from './NotificationIcon';
import styles from './NotificationList.module.css';

export interface NotificationListProps {
  notifications: Notification[];
  /** Signed-in role — only used to build the fallback destination per kind. */
  role: Role | null;
  isLoading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  hasMore?: boolean;
  isFetchingMore?: boolean;
  onLoadMore?: () => void;
  onMarkRead: (notificationId: string) => void;
  onMarkAllRead: () => void;
  unreadCount: number;
  isMarkingAll?: boolean;
  /** `panel` is the bell dropdown (compact, no page chrome). */
  variant?: 'panel' | 'page';
}

/**
 * One notification row (issue #107): icon by kind, PHI-light title/body, the
 * destination as a link, and a per-row "Mark as read". Unknown kinds render a
 * generic bell and a "Update" label, with a link only when the payload carries
 * a safe app-relative one.
 */
function NotificationRow({
  notification,
  role,
  onMarkRead,
}: {
  notification: Notification;
  role: Role | null;
  onMarkRead: (notificationId: string) => void;
}) {
  const meta = notificationMeta(notification.kind);
  const destination = notificationDestination(notification, role);
  const unread = notification.readAt === null;

  const content = (
    <>
      <NotificationIcon category={meta.category} />
      <span className={styles.copy}>
        <span className={styles.rowTop}>
          <span className={styles.title}>{notification.title}</span>
          {unread && <span className={styles.unreadDot} aria-hidden="true" />}
        </span>
        {notification.body && <span className={styles.body}>{notification.body}</span>}
        <span className={styles.meta}>
          <span className={styles.chip}>{meta.label}</span>
          <time dateTime={notification.createdAt} title={formatNotificationTimestamp(notification.createdAt)}>
            {formatNotificationTime(notification.createdAt)}
          </time>
        </span>
      </span>
    </>
  );

  return (
    <li className={styles.row} data-unread={unread ? 'true' : 'false'}>
      {destination ? (
        <Link className={styles.link} to={destination}>
          {content}
          {unread && <span className={styles.srOnly}>Unread</span>}
        </Link>
      ) : (
        <div className={styles.link}>
          {content}
          {unread && <span className={styles.srOnly}>Unread</span>}
        </div>
      )}
      {unread && (
        <button
          type="button"
          className={styles.markRead}
          onClick={() => onMarkRead(notification.id)}
          aria-label={`Mark "${notification.title}" as read`}
        >
          Mark read
        </button>
      )}
    </li>
  );
}

export function NotificationList({
  notifications,
  role,
  isLoading = false,
  error,
  onRetry,
  hasMore = false,
  isFetchingMore = false,
  onLoadMore,
  onMarkRead,
  onMarkAllRead,
  unreadCount,
  isMarkingAll = false,
  variant = 'page',
}: NotificationListProps) {
  const isPanel = variant === 'panel';

  return (
    <section className={`${styles.list} ${isPanel ? styles.panel : ''}`} aria-label="Notifications">
      <div className={styles.header}>
        <h2 className={styles.heading}>{isPanel ? 'Notifications' : 'Your notifications'}</h2>
        <Button
          variant="secondary"
          size="small"
          onClick={onMarkAllRead}
          disabled={unreadCount === 0 || isMarkingAll}
          loading={isMarkingAll}
        >
          Mark all as read
        </Button>
      </div>

      {isLoading ? (
        <Skeleton lines={isPanel ? 4 : 6} height="1.15rem" label="Loading notifications" />
      ) : error ? (
        <InlineError
          message="Your notifications couldn't be loaded."
          title={null}
          onRetry={onRetry}
        />
      ) : notifications.length === 0 ? (
        <EmptyState
          title="You're all caught up"
          description="Bookings, referrals, orders, results and payment updates will appear here."
          action={{ label: 'Back to your dashboard', to: role ? roleHome(role) : '/' }}
        />
      ) : (
        <>
          <ul className={styles.items}>
            {notifications.map((notification) => (
              <NotificationRow
                key={notification.id}
                notification={notification}
                role={role}
                onMarkRead={onMarkRead}
              />
            ))}
          </ul>
          {hasMore && !isPanel && (
            <div className={styles.more}>
              <Button variant="secondary" onClick={onLoadMore} loading={isFetchingMore} disabled={isFetchingMore}>
                Load older notifications
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function roleHome(role: Role): string {
  switch (role) {
    case 'doctor':
      return '/doctor';
    case 'facility':
      return '/facility';
    case 'admin':
      return '/admin';
    default:
      return '/patient';
  }
}
