import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../../store/auth-store';
import { useProfileStore } from '../../../store/profile-store';
import { deleteAccount } from '../../../services/account-service';

export function useDeleteAccount() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const clearSession = useAuthStore((s) => s.clearSession);
  const setProfiles = useProfileStore((s) => s.setProfiles);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: ({ password, confirmation }: { password: string; confirmation: string }) =>
      deleteAccount(password, confirmation, accessToken!),
    onSuccess: () => {
      // Clear all server query cache to ensure no patient data survives
      queryClient.clear();
      // Clear client session
      clearSession();
      // Clear acting profile state
      setProfiles([]);
      // Navigate to post-deletion confirmation page
      navigate('/account-deleted');
    },
  });
}
