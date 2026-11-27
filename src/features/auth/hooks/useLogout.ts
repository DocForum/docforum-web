import { useMutation, useQueryClient } from '@tanstack/react-query';
import { logout } from '../../../services/auth-service';
import { broadcastLogout } from '../../../hooks/useSessionSync';
import { useAuthStore } from '../../../store/auth-store';
import { signOut } from '../../../services/sign-out';

export function useLogout() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const csrfToken = useAuthStore((state) => state.csrfToken);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => (accessToken ? logout(accessToken, csrfToken) : Promise.resolve()),
    // Clear local session regardless of whether the server call succeeds —
    // an unreachable/erroring logout endpoint shouldn't strand the user in
    // a logged-in-looking UI.
    onSettled: async () => {
      // One helper clears the auth session, CSRF token, query cache,
      // profile/acting-for store, unsaved-changes registry and app caches.
      await signOut('logout', { queryClient });
      // Tell other open tabs to drop their session too (issue #124).
      broadcastLogout();
    },
  });
}
