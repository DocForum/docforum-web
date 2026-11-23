import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import styles from './PageError.module.css';

export interface PageErrorProps {
  /** What the user was trying to see, e.g. "Your orders couldn't be loaded". */
  title: string;
  message: string;
  /** Retry the failed request. Omit when retrying cannot help. */
  onRetry?: () => void;
  /** Escape hatch when retry is not enough (e.g. a link back to the dashboard). */
  fallback?: { label: string; to: string };
  /** Extra detail rendered under the message (e.g. the request id). */
  detail?: ReactNode;
}

/**
 * Page-level error (issue #106) for a route whose *primary* query failed:
 * the screen has nothing meaningful to show, so it says what failed, offers a
 * retry, and gives a way out instead of leaving a blank page or an endless
 * spinner. `role="alert"` announces it once.
 */
export function PageError({ title, message, onRetry, fallback, detail }: PageErrorProps) {
  return (
    <div className={styles.error} role="alert">
      <h2 className={styles.title}>{title}</h2>
      <p className={styles.message}>{message}</p>
      {detail && <div className={styles.detail}>{detail}</div>}
      <div className={styles.actions}>
        {onRetry && (
          <button type="button" className={styles.primary} onClick={onRetry}>
            Try again
          </button>
        )}
        {fallback && (
          <Link className={styles.secondary} to={fallback.to}>
            {fallback.label}
          </Link>
        )}
      </div>
    </div>
  );
}
