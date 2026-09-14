import { useMutation } from '@tanstack/react-query';
import { login } from '../../../services/auth-service';
import { useAuthStore } from '../../../store/auth-store';

export function useLogin() {
  const setSession = useAuthStore((state) => state.setSession);

  return useMutation({
    mutationFn: login,
    onSuccess: (session) => setSession(session.user, session.accessToken),
  });
}
