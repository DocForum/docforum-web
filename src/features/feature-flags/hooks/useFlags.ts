import { useQuery } from '@tanstack/react-query';
import * as myFlagsService from '../../../services/my-flags-service';
import { useAuthStore } from '../../../store/auth-store';
import { flagEnabled } from '../flags';
import type { EvaluatedFlags } from '../../../types/models';

export function myFlagsKey(userId: string | null | undefined) {
  return ['me', 'flags', userId ?? 'anonymous'] as const;
}

/**
 * Fetch the current user's evaluated flags once per session (issue #111).
 * Flags are server-evaluated; the client only reads booleans. On failure
 * every `useFlag` answer is `false` (safe default).
 */
export function useMyFlags() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const userId = useAuthStore((state) => state.user?.id);

  return useQuery({
    queryKey: myFlagsKey(userId),
    queryFn: ({ signal }) => myFlagsService.getMyFlags(accessToken!, signal),
    enabled: Boolean(accessToken && userId),
    // Flags rarely change mid-session; the SSE stream / refocus will pick
    // up a rollout change soon enough.
    staleTime: 5 * 60_000,
    retry: 1,
  });
}

export function useFlag(name: string): boolean {
  const query = useMyFlags();
  return flagEnabled(query.data?.flags, name);
}

/** Loading/error state for gating UI without a layout flash. */
export function useFlagsStatus(): {
  isLoading: boolean;
  isError: boolean;
  flags: Record<string, boolean> | undefined;
} {
  const query = useMyFlags();
  return {
    isLoading: query.isLoading,
    isError: query.isError,
    flags: query.isError ? undefined : query.data?.flags,
  };
}

export type { EvaluatedFlags };
