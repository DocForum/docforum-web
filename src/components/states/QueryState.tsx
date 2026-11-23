import type { ReactNode } from 'react';
import { ApiError } from '../../services/api-client';
import { EmptyState } from './EmptyState';
import { Skeleton } from './Skeleton';
import styles from './QueryState.module.css';

/** The slice of a React Query result `QueryState` needs. Structural, so it
 * accepts `useQuery`, `useInfiniteQuery` and view-model objects. */
export interface QueryStateResult<T> {
  isPending: boolean;
  isError: boolean;
  error: unknown;
  data: T | undefined;
  refetch?: () => unknown;
}

export interface QueryStateProps<T> {
  result: QueryStateResult<T>;
  /** Rendered while the first page is loading. Default: three skeleton lines. */
  loading?: ReactNode;
  loadingLabel?: string;
  errorTitle?: string;
  /** Override the derived message. A function receives the error. */
  errorMessage?: string | ((error: unknown) => string);
  onRetry?: () => void;
  /** Called once data arrives. Return true to render `empty` instead. */
  isEmpty?: (data: T) => boolean;
  empty?: ReactNode;
  children: ReactNode | ((data: T) => ReactNode);
}

/** Human-readable message for anything a query can reject with. */
export function queryErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 0) return "We couldn't reach the server. Check your connection and try again.";
    if (error.status === 403) return "You don't have access to this. Sign in again if your session expired.";
    if (error.status === 404) return "This isn't available any more.";
    if (error.status >= 500) return 'The server had a problem. Try again in a moment.';
    return error.message;
  }
  if (error instanceof Error && error.message) return error.message;
  return 'Something went wrong.';
}

/**
 * Picks the right state for a query result: a skeleton while the first page
 * loads, an error with retry when it fails, the caller's empty state when the
 * data is genuinely empty, and the content otherwise.
 *
 * Refetching after data has arrived is not a skeleton — the previous content
 * stays on screen, because replacing real figures with placeholders on every
 * poll is worse than a brief stale read.
 */
export function QueryState<T>({
  result,
  loading,
  loadingLabel,
  errorTitle,
  errorMessage,
  onRetry,
  isEmpty,
  empty,
  children,
}: QueryStateProps<T>) {
  if (result.isPending) {
    return <>{loading ?? <Skeleton lines={3} label={loadingLabel} />}</>;
  }

  // An error while refetching or loading a later page must not replace
  // content that has already arrived. Only a first-load failure with no data
  // takes over the area; callers surface background failures separately.
  if (result.isError && result.data === undefined) {
    const message =
      typeof errorMessage === 'function'
        ? errorMessage(result.error)
        : errorMessage ?? queryErrorMessage(result.error);
    const retry = onRetry ?? (result.refetch ? () => void result.refetch?.() : undefined);

    return (
      <div className={styles.error} role="alert">
        <div>
          <p className={styles.errorTitle}>{errorTitle ?? "This couldn't be loaded"}</p>
          <p className={styles.errorMessage}>{message}</p>
        </div>
        {retry && (
          <button type="button" className={styles.retry} onClick={retry}>
            Try again
          </button>
        )}
      </div>
    );
  }

  if (isEmpty && result.data !== undefined && isEmpty(result.data)) {
    return (
      <>
        {empty ?? (
          <EmptyState
            title="Nothing here yet"
            action={{ label: 'Reload', onClick: () => void result.refetch?.() }}
          />
        )}
      </>
    );
  }

  return <>{typeof children === 'function' ? (children as (data: T) => ReactNode)(result.data as T) : children}</>;
}
