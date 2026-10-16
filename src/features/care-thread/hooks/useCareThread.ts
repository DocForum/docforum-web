import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../../store/auth-store';
import { useProfileStore } from '../../../store/profile-store';
import { getCareThreadById, getCareThreads } from '../../../services/care-thread-service';
import type { CareThread } from '../../../types/models';

export function useCareThreads() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const selectedProfileId = useProfileStore((s) => s.selectedProfileId);

  return useQuery<CareThread[]>({
    queryKey: ['care-threads', selectedProfileId],
    queryFn: async () => {
      if (!selectedProfileId || !accessToken) return [];
      try {
        return await getCareThreads(selectedProfileId, accessToken);
      } catch (err) {
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
    queryKey: ['care-thread', threadId],
    queryFn: async () => {
      if (!threadId || !accessToken) return null;
      try {
        return await getCareThreadById(threadId, accessToken);
      } catch (err) {
        // If 404 or not found, return null so component handles empty/missing state gracefully
        return null;
      }
    },
    enabled: Boolean(threadId && accessToken),
  });
}
