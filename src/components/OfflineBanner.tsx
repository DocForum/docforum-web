import { useEffect, useRef, useState } from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import styles from './OfflineBanner.module.css';

/**
 * Distinguishes "you are offline" from the existing slow-request hint
 * (server cold-starting): this banner only appears for the former. The
 * polite live region stays mounted and announces reconnection once.
 */
export function OfflineBanner() {
  const online = useOnlineStatus();
  const wasOffline = useRef(false);
  const [announcement, setAnnouncement] = useState('');

  useEffect(() => {
    if (!online) {
      wasOffline.current = true;
      setAnnouncement('');
      return;
    }
    if (wasOffline.current) {
      wasOffline.current = false;
      setAnnouncement('Back online. Refreshing data.');
    }
  }, [online]);

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
    </>
  );
}
