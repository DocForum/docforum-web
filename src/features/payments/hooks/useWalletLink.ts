import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as paymentsService from '../../../services/payments-service';
import { useAuthStore } from '../../../store/auth-store';
import { ApiError } from '../../../services/api-client';

const WALLET_LINK_QUERY_KEY = ['payments', 'wallet-link'] as const;

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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: WALLET_LINK_QUERY_KEY }),
  });
}
