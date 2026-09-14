import { useMutation } from '@tanstack/react-query';
import { logout } from '../../../services/auth-service';
import { useAuthStore } from '../../../store/auth-store';

export function useLogout() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const clearSession = useAuthStore((state) => state.clearSession);

  return useMutation({
    mutationFn: () => (accessToken ? logout(accessToken) : Promise.resolve()),
    // Clear local session regardless of whether the server call succeeds —
    // an unreachable/erroring logout endpoint shouldn't strand the user in
    // a logged-in-looking UI.
    onSettled: () => clearSession(),
  });
}
