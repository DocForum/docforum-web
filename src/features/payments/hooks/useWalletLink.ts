import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as paymentsService from '../../../services/payments-service';
import { useAuthStore } from '../../../store/auth-store';
import { ApiError } from '../../../services/api-client';
import { invalidateFor } from '../../../invalidations';
import { paymentKeys } from '../../../query-keys';

const WALLET_LINK_QUERY_KEY = paymentKeys.walletLink();

export function useOwnWalletLink() {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: WALLET_LINK_QUERY_KEY,
    queryFn: () => paymentsService.getOwnWalletLink(accessToken!),
    enabled: Boolean(accessToken),
    // No wallet linked yet is an expected, non-error state, not a fetch
    // failure — the endpoint 404s in that case (see docforum-core
    // controller). Don't retry a 404 as if it were transient.
    retry: (failureCount, error) => error instanceof ApiError && error.status === 404 ? false : failureCount < 2,
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
