import { useMessageThreads } from '../hooks/useMessageThreads';
import styles from './UnreadBadge.module.css';

export function UnreadBadge() {
  const { totalUnread } = useMessageThreads({ filter: 'all', cursor: null, limit: 10 });

  if (totalUnread === 0) return null;

  return (
    <span className={styles.badge} aria-label={`Unread messages: ${totalUnread}`}>
      {totalUnread > 99 ? '99+' : totalUnread}
    </span>
  );
}
