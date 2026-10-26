import { useT } from '../../../i18n/useT';
import { useMessageThreads } from '../hooks/useMessageThreads';
import styles from './UnreadBadge.module.css';

export function UnreadBadge() {
  const t = useT();
  const { totalUnread } = useMessageThreads({ filter: 'all', cursor: null, limit: 10 });

  if (totalUnread === 0) return null;

  return (
    <span className={styles.badge} aria-label={t('messaging.unreadLabel', 'Unread messages: {count}', { count: totalUnread })}>
      {totalUnread > 99 ? '99+' : totalUnread}
    </span>
  );
}
