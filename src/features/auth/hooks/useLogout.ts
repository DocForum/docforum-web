import { useMutation, useQueryClient } from '@tanstack/react-query';
import { logout } from '../../../services/auth-service';
import { useAuthStore } from '../../../store/auth-store';
import { clearCachedUserData } from '../../../pwa/caches';

export function useLogout() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const csrfToken = useAuthStore((state) => state.csrfToken);
  const clearSession = useAuthStore((state) => state.clearSession);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => (accessToken ? logout(accessToken, csrfToken) : Promise.resolve()),
    // Clear local session regardless of whether the server call succeeds —
    // an unreachable/erroring logout endpoint shouldn't strand the user in
    // a logged-in-looking UI.
    onSettled: async () => {
      clearSession();
      // No server-derived data survives logout: React Query's in-memory cache
      // is dropped, and any app-owned service-worker cache is purged. The
      // precache (hashed static shell only) is intentionally kept so the
      // offline shell still works after signing out.
      queryClient.clear();
      await clearCachedUserData();
    },
  });
}
