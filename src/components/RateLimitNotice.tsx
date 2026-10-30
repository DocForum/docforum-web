import { useEffect, useState } from 'react';
import { useRateLimitStore } from '../store/rate-limit-store';
import styles from './RateLimitNotice.module.css';

/**
 * One non-blocking notice for any 429 the API client sees (issue #80). It
 * never steals focus or blocks the page: callers still show their own inline
 * message, and the notice clears itself when the wait is over.
 *
 * The live countdown is hidden from assistive tech (announcing every tick
 * would be noise); a polite status message is announced once instead.
 */
export function RateLimitNotice() {
  const retryAt = useRateLimitStore((state) => state.retryAt);
  const clear = useRateLimitStore((state) => state.clear);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (retryAt === null) return undefined;
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [retryAt]);

  useEffect(() => {
    if (retryAt !== null && retryAt <= now) clear();
  }, [retryAt, now, clear]);

  if (retryAt === null) return null;

  const seconds = Math.max(0, Math.ceil((retryAt - now) / 1000));
  if (seconds <= 0) return null;

  return (
    <div className={styles.notice} data-testid="rate-limit-notice">
      <p className={styles.message}>
        <span aria-hidden="true">
          Too many requests — you can try again in {seconds} {seconds === 1 ? 'second' : 'seconds'}.
        </span>
        <span className={styles.visuallyHidden} role="status" aria-live="polite">
          Too many requests. Please wait before trying again.
        </span>
      </p>
      <button
        type="button"
        className={styles.dismiss}
        onClick={clear}
        aria-label="Dismiss rate limit notice"
      >
        ✕
      </button>
    </div>
  );
}
