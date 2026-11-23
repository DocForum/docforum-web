// Single shared React Query client. Exported so the mock dev panel
// (issue #95) can invalidate every cache when the scenario/role changes —
// main.tsx mounts the same instance, so app behaviour is unchanged.
import { QueryClient } from '@tanstack/react-query';
import { isAbortError, RateLimitError } from './services/api-client';
import { registerSignOutQueryClient } from './services/sign-out';

const BASE_RETRY_DELAY_MS = 1_000;
const MAX_RETRY_DELAY_MS = 30_000;

/**
 * Exponential backoff, except when the server said how long to wait: a 429's
 * `Retry-After` is a floor, so a retry can never fire sooner than allowed
 * (issue #80).
 */
export function retryDelay(failureCount: number, error: unknown): number {
  if (error instanceof RateLimitError) return error.retryAfterMs;
  return Math.min(BASE_RETRY_DELAY_MS * 2 ** Math.max(0, failureCount - 1), MAX_RETRY_DELAY_MS);
}

/** One automatic retry for ordinary failures (and 429s, delayed by retryDelay). */
export function shouldRetry(failureCount: number): boolean {
  return failureCount < 1;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Retry policy (issue #123): one retry for transient failures (network
      // blips, a cold-starting backend answering slowly), never for a
      // cancellation — an aborted request is not a failure, and retrying it
      // would fire a request no component is waiting for any more.
      retry: (failureCount, error) => !isAbortError(error) && shouldRetry(failureCount),
      retryDelay,
      refetchOnWindowFocus: false,
    },
  },
});

// Lets the transport's refresh-failure path clear this cache via
// `signOut` without importing this module (issue #227).
registerSignOutQueryClient(queryClient);
