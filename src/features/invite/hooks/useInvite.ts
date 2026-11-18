// Invitation redemption hooks (issue #81). The invite token is the
// credential for the lookup; the role always comes back from
// docforum-core — never from client state.
import { useMutation, useQuery } from '@tanstack/react-query';
import { acceptInvite, getInvite, type AcceptInviteInput } from '../../../services/auth-service';
import { useAuthStore } from '../../../store/auth-store';

export function useInvite(token: string | null) {
  return useQuery({
    queryKey: ['invite', token],
    queryFn: () => getInvite(token!),
    enabled: Boolean(token),
    retry: false,
  });
}

export function useAcceptInvite() {
  const setSession = useAuthStore((state) => state.setSession);
  const accessToken = useAuthStore((state) => state.accessToken);

  return useMutation({
    // An existing user accepts with their session (bearer token from the
    // store); a brand-new account has no session yet, so none is sent.
    mutationFn: ({ input, accessToken: override }: { input: AcceptInviteInput; accessToken?: string | null }) =>
      acceptInvite(input, override ?? accessToken),
    onSuccess: (session) => setSession(session.user, session.accessToken),
  });
}
