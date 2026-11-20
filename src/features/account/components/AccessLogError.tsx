import { ApiError } from '../../../services/api-client';
import styles from './AccessLogList.module.css';

/** The access-log endpoint belongs to docforum-core#45. Until it exists the
 * patient must be told the log could not be asked for, not that it is empty. */
export function AccessLogError({ error }: { error: unknown }) {
  const message =
    error instanceof ApiError && error.status === 404
      ? 'Your access log is not available yet — DocForum has not started recording who opens records for this deployment.'
      : error instanceof ApiError
        ? error.message
        : 'Your access log could not be loaded.';

  return (
    <p className={styles.empty} role="alert">
      {message}
    </p>
  );
}
