import { useMutation, useQueryClient } from '@tanstack/react-query';
import { logout } from '../../../services/auth-service';
import { broadcastLogout } from '../../../hooks/useSessionSync';
import { useAuthStore } from '../../../store/auth-store';
import { useProfileStore } from '../../../store/profile-store';

export function useLogout() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const clearSession = useAuthStore((state) => state.clearSession);
  const clearProfiles = useProfileStore((state) => state.clearProfiles);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => (accessToken ? logout(accessToken) : Promise.resolve()),
    // Clear local session regardless of whether the server call succeeds —
    // an unreachable/erroring logout endpoint shouldn't strand the user in
    // a logged-in-looking UI.
    onSettled: () => {
      broadcastLogout();
      queryClient.clear();
      clearSession();
      clearProfiles();
    },
  });
}
