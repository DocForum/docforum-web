import { useEffect, useId, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../../store/auth-store';
import { NOTIFICATIONS_PAGE_SIZE } from '../../../services/notifications-service';
import { useNotifications } from '../hooks/useNotifications';
import { useNotificationLiveUpdates } from '../hooks/useNotificationLiveUpdates';
import { notificationDestination } from '../notification-meta';
import { formatNotificationTime } from '../notification-time';
import { NotificationIcon } from './NotificationIcon';
import { notificationMeta } from '../notification-meta';
import styles from './NotificationBell.module.css';

/** Only the newest few rows fit in a dropdown; the page shows the rest. */
const PANEL_LIMIT = 6;

/**
 * Notification bell (issue #107): unread badge in the header, a dropdown with
 * the newest notifications, deep links per kind and mark-as-read.
 *
 * Accessibility: a labelled toggle with `aria-expanded`/`aria-controls`, Escape
 * closes and returns focus to the button, clicking outside closes it, and the
 * panel closes on navigation. The badge is decorative for screen readers
 * because the button's label already states the count.
 */
export function NotificationBell() {
  const user = useAuthStore((state) => state.user);
  const role = user?.role ?? null;
  const enabled = Boolean(user);
  const inbox = useNotifications({ enabled, limit: NOTIFICATIONS_PAGE_SIZE });
  useNotificationLiveUpdates(enabled, NOTIFICATIONS_PAGE_SIZE);

  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const location = useLocation();

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event: PointerEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      buttonRef.current?.focus();
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  if (!user) return null;

  const { unreadCount, notifications } = inbox;
  const badge = unreadCount > 99 ? '99+' : String(unreadCount);
  const preview = notifications.slice(0, PANEL_LIMIT);

  const markRead = (notificationId: string) => {
    inbox.markRead.mutate(notificationId);
  };

  return (
    <div className={styles.wrap} ref={wrapperRef}>
      <button
        ref={buttonRef}
        type="button"
        className={styles.bell}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={
          unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications, none unread'
        }
        onClick={() => setOpen((value) => !value)}
      >
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M6 17h12l-2-3V9a4 4 0 0 0-8 0v5zM10 20h4" />
        </svg>
        {unreadCount > 0 && (
          <span className={styles.badge} aria-hidden="true">
            {badge}
          </span>
        )}
      </button>

      {open && (
        <div id={panelId} className={styles.panel}>
          {inbox.isLoading ? (
            <p className={styles.panelNote}>Loading notifications…</p>
          ) : inbox.error ? (
            <div className={styles.panelNote}>
              <p>Your notifications couldn't be loaded.</p>
              <button type="button" className={styles.retry} onClick={() => void inbox.refetch()}>
                Try again
              </button>
            </div>
          ) : preview.length === 0 ? (
            <p className={styles.panelNote}>You're all caught up.</p>
          ) : (
            <ul className={styles.items}>
              {preview.map((notification) => {
                const destination = notificationDestination(notification, role);
                const meta = notificationMeta(notification.kind);
                const unread = notification.readAt === null;
                const inner = (
                  <>
                    <NotificationIcon category={meta.category} />
                    <span className={styles.copy}>
                      <span className={styles.title}>{notification.title}</span>
                      <span className={styles.time}>{formatNotificationTime(notification.createdAt)}</span>
                    </span>
                    {unread && <span className={styles.unreadDot} aria-hidden="true" />}
                  </>
                );
                return (
                  <li key={notification.id} className={styles.item} data-unread={unread ? 'true' : 'false'}>
                    {destination ? (
                      <Link className={styles.itemLink} to={destination} onClick={() => unread && markRead(notification.id)}>
                        {inner}
                      </Link>
                    ) : (
                      <div className={styles.itemLink}>{inner}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          <div className={styles.footer}>
            <Link to="/notifications" className={styles.viewAll}>
              View all notifications
            </Link>
            <button
              type="button"
              className={styles.markAll}
              onClick={() => inbox.markAllRead.mutate()}
              disabled={unreadCount === 0 || inbox.markAllRead.isPending}
            >
              Mark all as read
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
