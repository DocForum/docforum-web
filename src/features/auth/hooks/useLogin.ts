import { useMutation } from '@tanstack/react-query';
import { isAuthSession, login } from '../../../services/auth-service';
import { useAuthStore } from '../../../store/auth-store';

export function useLogin() {
  const setSession = useAuthStore((state) => state.setSession);
  const clearSession = useAuthStore((state) => state.clearSession);

  return useMutation({
    mutationFn: login,
    onSuccess: (result) => {
      if (isAuthSession(result)) setSession(result.user, result.accessToken);
      else clearSession();
    },
  });
}
