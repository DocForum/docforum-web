import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as paymentsService from '../../../services/payments-service';
import { useAuthStore } from '../../../store/auth-store';
import { invalidateFor } from '../../../invalidations';
import { paymentKeys } from '../../../query-keys';

const WALLET_LINK_QUERY_KEY = paymentKeys.walletLink();

export function useOwnWalletLink() {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: WALLET_LINK_QUERY_KEY,
    queryFn: ({ signal }) => paymentsService.getOwnWalletLink(accessToken!, signal),
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
    onSuccess: () => invalidateFor(queryClient, 'payments.wallet-link'),
  });
}
