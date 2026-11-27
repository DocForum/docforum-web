import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../../store/auth-store';
import { deleteAccount } from '../../../services/account-service';
import { signOut } from '../../../services/sign-out';
import { paths } from '../../../routes/paths';

export function useDeleteAccount() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: ({ password }: { password: string }) => deleteAccount(password, accessToken!),
    onSuccess: async () => {
      // The account is gone: drop every piece of client state through the
      // same helper as every other sign-out path (issue #227).
      await signOut('account-deleted', { queryClient });
      // Navigate to post-deletion confirmation page
      navigate(paths.accountDeleted);
    },
  });
}
