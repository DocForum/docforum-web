import { Link, isRouteErrorResponse, useRouteError } from 'react-router-dom';
import styles from './RouteError.module.css';

/** Route-level error boundary. Data-router loaders and lazy route modules
 * throw into here instead of blanking the app. */
export function RouteError() {
  const error = useRouteError();
  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`.trim()
    : error instanceof Error
      ? error.message
      : 'Something went wrong while loading this page.';

  return (
    <div className={styles.wrapper} role="alert">
      <div className={styles.card}>
        <h1 className={styles.title}>This page didn’t load</h1>
        <p className={styles.message}>{message}</p>
        <p className={styles.actions}>
          <Link to="/" className={styles.link}>
            Back to home
          </Link>
          <button type="button" className={styles.retry} onClick={() => window.location.reload()}>
            Reload the page
          </button>
        </p>
      </div>
    </div>
  );
}
