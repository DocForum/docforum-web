import { useMutation } from '@tanstack/react-query';
import { signup } from '../../../services/auth-service';
import { useAuthStore } from '../../../store/auth-store';

export function useSignup() {
  const setSession = useAuthStore((state) => state.setSession);

  return useMutation({
    mutationFn: signup,
    onSuccess: (session) => setSession(session.user, session.accessToken),
  });
}
