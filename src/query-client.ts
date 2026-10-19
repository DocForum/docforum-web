// Single shared React Query client. Exported so the mock dev panel
// (issue #95) can invalidate every cache when the scenario/role changes —
// main.tsx mounts the same instance, so app behaviour is unchanged.
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
