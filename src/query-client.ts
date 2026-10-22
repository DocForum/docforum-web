// Single shared React Query client. Exported so the mock dev panel
// (issue #95) can invalidate every cache when the scenario/role changes —
// main.tsx mounts the same instance, so app behaviour is unchanged.
import { QueryClient } from '@tanstack/react-query';
import { isAbortError } from './services/api-client';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Retry policy (issue #123): one retry for transient failures (network
      // blips, a cold-starting backend answering slowly), never for a
      // cancellation — an aborted request is not a failure, and retrying it
      // would fire a request no component is waiting for any more.
      retry: (failureCount, error) => !isAbortError(error) && failureCount < 1,
      refetchOnWindowFocus: false,
    },
  },
});
