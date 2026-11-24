import type { ReactNode } from 'react';
import { ApiError, ApiTimeoutError } from '../../services/api-client';
import { EmptyState } from './EmptyState';
import { InlineError } from './InlineError';
import { PageError } from './PageError';
import { Skeleton } from './Skeleton';

/** The slice of a React Query result `QueryState` needs. Structural, so it
 * accepts `useQuery`, `useInfiniteQuery` (via its first page) and the
 * view-model objects feature hooks return. */
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
  /** `page` renders `PageError`; `inline` (default) renders `InlineError`. */
  errorLayout?: 'inline' | 'page';
  /** When the whole route has nothing but this query, use `page` so the
   * retry gets the space it deserves. */
  fallback?: { label: string; to: string };
  children: ReactNode | ((data: T) => ReactNode);
}

/** Human-readable message for anything a query can reject with. */
export function queryErrorMessage(error: unknown): string {
  if (error instanceof ApiTimeoutError) {
    return 'The server is taking too long to respond. It may be waking up — try again in a moment.';
  }
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
 * Picks the right state for a query result (issue #106): skeleton while the
 * first page loads, an error with retry when it fails, the caller's empty state
 * when the data is genuinely empty, and the content otherwise.
 *
 * ```tsx
 * <QueryState
 *   result={ordersQuery}
 *   isEmpty={(orders) => orders.length === 0}
 *   empty={<EmptyState title="No orders yet" action={{ label: 'Back to your care hub', to: '/patient' }} />}
 *   onRetry={() => ordersQuery.refetch()}
 * >
 *   <OrdersTable orders={ordersQuery.data ?? []} />
 * </QueryState>
 * ```
 *
 * Refetching after data arrived is *not* a skeleton: the previous rows stay on
 * screen and the screen's own refresh affordance reports progress, because
 * replacing content with placeholders on every poll is worse than a brief stale
 * read.
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
  errorLayout = 'inline',
  fallback,
  children,
}: QueryStateProps<T>) {
  if (result.isPending) {
    return <>{loading ?? <Skeleton lines={3} label={loadingLabel} />}</>;
  }

  if (result.isError) {
    const message =
      typeof errorMessage === 'function'
        ? errorMessage(result.error)
        : errorMessage ?? queryErrorMessage(result.error);
    const retry = onRetry ?? (() => void result.refetch?.());

    if (errorLayout === 'page') {
      return (
        <PageError
          title={errorTitle ?? "This couldn't be loaded"}
          message={message}
          onRetry={result.refetch || onRetry ? retry : undefined}
          fallback={fallback}
        />
      );
    }

    return (
      <InlineError
        title={errorTitle}
        message={message}
        onRetry={result.refetch || onRetry ? retry : undefined}
      />
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
