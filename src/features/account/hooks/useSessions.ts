import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../../store/auth-store';
import { listSessions, revokeOtherSessions, revokeSession } from '../../../services/auth-service';
import type { ActiveSession } from '../../../types/models';

export const SESSIONS_QUERY_KEY = ['auth', 'sessions'] as const;

export function useSessions() {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: SESSIONS_QUERY_KEY,
    queryFn: () => listSessions(accessToken!),
    enabled: Boolean(accessToken),
  });
}

export function useRevokeSession() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sessionId: string) => revokeSession(sessionId, accessToken!),
    onSuccess: (_data, sessionId) => {
      queryClient.setQueryData<ActiveSession[]>(SESSIONS_QUERY_KEY, (sessions) =>
        sessions ? sessions.filter((session) => session.id !== sessionId) : sessions,
      );
      void queryClient.invalidateQueries({ queryKey: SESSIONS_QUERY_KEY });
    },
  });
}

export function useRevokeOtherSessions() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => revokeOtherSessions(accessToken!),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: SESSIONS_QUERY_KEY });
    },
  });
}
