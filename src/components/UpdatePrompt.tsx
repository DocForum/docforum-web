import { useIntl } from 'react-intl';
import { Button } from './Button';
import styles from './UpdatePrompt.module.css';

interface UpdatePromptProps {
  /** A new service worker is installed and waiting. */
  needRefresh: boolean;
  /** The app shell finished caching and can run offline. */
  offlineReady?: boolean;
  onReload: () => void;
  onDismiss: () => void;
}

/**
 * Shown when a new deployment is waiting. Reloading is explicit — a service
 * worker must never swap code out from under an in-progress consultation.
 */
export function UpdatePrompt({ needRefresh, offlineReady = false, onReload, onDismiss }: UpdatePromptProps) {
  const intl = useIntl();

  if (!needRefresh && !offlineReady) return null;

  return (
    <div className={styles.banner} role="status" aria-live="polite">
      <p className={styles.text}>
        {needRefresh
          ? intl.formatMessage({
              id: 'pwa.updateAvailable',
              defaultMessage: 'A new version of DocForum is available.',
            })
          : intl.formatMessage({
              id: 'pwa.offlineReady',
              defaultMessage: 'DocForum is ready to load offline.',
            })}
      </p>
      <div className={styles.actions}>
        {needRefresh && (
          <>
            <Button onClick={onReload}>
              {intl.formatMessage({ id: 'pwa.reload', defaultMessage: 'Reload' })}
            </Button>
            <button type="button" className={styles.dismiss} onClick={onDismiss}>
              {intl.formatMessage({ id: 'pwa.later', defaultMessage: 'Later' })}
            </button>
          </>
        )}
        {!needRefresh && (
          <button type="button" className={styles.dismiss} onClick={onDismiss}>
            {intl.formatMessage({ id: 'pwa.dismiss', defaultMessage: 'Dismiss' })}
          </button>
        )}
      </div>
    </div>
  );
}
