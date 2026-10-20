import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../../store/auth-store';
import { useProfileStore } from '../../../store/profile-store';
import { getCareThreadById, getCareThreads } from '../../../services/care-thread-service';
import { isAbortError } from '../../../services/api-client';
import { careThreadKeys } from '../../../query-keys';
import type { CareThread } from '../../../types/models';

export function useCareThreads() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const selectedProfileId = useProfileStore((s) => s.selectedProfileId);

  return useQuery<CareThread[]>({
    queryKey: careThreadKeys.list(selectedProfileId ?? ''),
    queryFn: async ({ signal }) => {
      if (!selectedProfileId || !accessToken) return [];
      try {
        return await getCareThreads(selectedProfileId, accessToken, signal);
      } catch (err) {
        // A cancellation is not a "backend missing" answer — let React Query
        // see it so the result is discarded instead of stored as [].
        if (isAbortError(err)) throw err;
        // Graceful degradation: if endpoint is not yet mounted on backend, return empty array
        return [];
      }
    },
    enabled: Boolean(selectedProfileId && accessToken),
  });
}

export function useCareThread(threadId?: string) {
  const accessToken = useAuthStore((s) => s.accessToken);

  return useQuery<CareThread | null>({
    queryKey: careThreadKeys.detail(threadId ?? ''),
    queryFn: async ({ signal }) => {
      if (!threadId || !accessToken) return null;
      try {
        return await getCareThreadById(threadId, accessToken, signal);
      } catch (err) {
        if (isAbortError(err)) throw err;
        // If 404 or not found, return null so component handles empty/missing state gracefully
        return null;
      }
    },
    enabled: Boolean(threadId && accessToken),
  });
}
