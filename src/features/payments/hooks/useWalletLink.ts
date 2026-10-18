import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as paymentsService from '../../../services/payments-service';
import { useAuthStore } from '../../../store/auth-store';
const WALLET_LINK_QUERY_KEY = ['payments', 'wallet-link'] as const;

export function useOwnWalletLink() {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: WALLET_LINK_QUERY_KEY,
    queryFn: () => paymentsService.getOwnWalletLink(accessToken!),
    enabled: Boolean(accessToken),
    // Retry policy lives in apiFetch; React Query must not double-retry.
    // A missing wallet is a 404 and is never retried there.
    retry: false,
  });
}

export function useLinkWallet() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (stellarPublicKey: string) => paymentsService.linkWallet(stellarPublicKey, accessToken!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: WALLET_LINK_QUERY_KEY }),
  });
}
