import styles from './InlineError.module.css';

export interface InlineErrorProps {
  /** What failed, in the user's terms. Server messages are shown verbatim. */
  message: string;
  /** Optional heading; defaults to "Couldn't load this". Pass `null` to omit. */
  title?: string | null;
  /** Retry affordance — shown only when the caller can actually retry. */
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

/**
 * Inline error (issue #106) for a failed section inside an otherwise working
 * screen: it keeps the rest of the page usable and offers a retry when one is
 * possible. `role="alert"` announces it when it appears.
 */
export function InlineError({
  message,
  title = "Couldn't load this",
  onRetry,
  retryLabel = 'Try again',
  className,
}: InlineErrorProps) {
  return (
    <div className={[styles.error, className].filter(Boolean).join(' ')} role="alert">
      <div className={styles.copy}>
        {title && <p className={styles.title}>{title}</p>}
        <p className={styles.message}>{message}</p>
      </div>
      {onRetry && (
        <button type="button" className={styles.retry} onClick={onRetry}>
          {retryLabel}
        </button>
      )}
    </div>
  );
}
