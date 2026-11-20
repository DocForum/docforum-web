import { useEffect, useRef, useState } from 'react';
import { useOnlineStatus, useApiReachability } from '../hooks/useOnlineStatus';
import { pingHealthLive } from '../services/system-health-service';
import { queryClient } from '../query-client';
import styles from './OfflineBanner.module.css';

/**
 * Distinguishes "you are offline" from the server waking up / unreachable:
 * - "You're offline" appears only when browser connectivity is lost.
 * - "Our server is waking up / unreachable" appears when the browser is online
 *   but docforum-core cannot be reached (cold start, sleeping instance, or 5xx).
 * The polite live region stays mounted and announces reconnection once.
 */
export function OfflineBanner() {
  const online = useOnlineStatus();
  const apiReachable = useApiReachability();
  const wasOffline = useRef(false);
  const wasUnreachable = useRef(false);
  const [announcement, setAnnouncement] = useState('');
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    if (!online) {
      wasOffline.current = true;
      setAnnouncement('');
      return;
    }

    if (wasOffline.current) {
      wasOffline.current = false;
      setAnnouncement('Back online. Refreshing data.');
      return;
    }

    if (!apiReachable) {
      wasUnreachable.current = true;
      setAnnouncement('');
      return;
    }

    if (wasUnreachable.current) {
      wasUnreachable.current = false;
      setAnnouncement('Server connected. Refreshing data.');
    }
  }, [online, apiReachable]);

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      const live = await pingHealthLive();
      if (live) {
        void queryClient.refetchQueries({ type: 'active' });
      }
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <>
      <div role="status" aria-live="polite" aria-atomic="true" className="srOnly">
        {announcement}
      </div>
      {!online && (
        <div className={styles.banner} role="status" aria-live="polite">
          <span aria-hidden="true" className={styles.dot} />
          <span>
            <strong>You&apos;re offline.</strong> Showing the last loaded data. We&apos;ll reconnect
            automatically — actions that change data are paused until then.
          </span>
        </div>
      )}
      {online && !apiReachable && (
        <div className={styles.banner} role="status" aria-live="polite">
          <span aria-hidden="true" className={styles.dot} />
          <span className={styles.content}>
            <strong>Our server is waking up / unreachable.</strong> Connecting to DocForum. We&apos;ll keep trying, or you can retry now.
          </span>
          <button
            type="button"
            className={styles.retryButton}
            onClick={handleRetry}
            disabled={isRetrying}
          >
            {isRetrying ? 'Retrying…' : 'Retry'}
          </button>
        </div>
      )}
    </>
  );
}
