import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as paymentsService from '../../../services/payments-service';
import type { CreatePaymentIntentInput } from '../../../services/payments-service';
import { useAuthStore } from '../../../store/auth-store';
import { invalidateFor } from '../../../invalidations';
import { paymentKeys } from '../../../query-keys';

export function usePaymentIntent(id: string | null) {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: paymentKeys.intent(id ?? ''),
    queryFn: ({ signal }) => paymentsService.getPaymentIntent(id!, accessToken!, signal),
    enabled: Boolean(accessToken && id),
  });
}

export function useCreatePaymentIntent() {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useMutation({
    mutationFn: (input: CreatePaymentIntentInput) => paymentsService.createPaymentIntent(input, accessToken!),
  });
}

function useIntentAction(action: (id: string, accessToken: string) => ReturnType<typeof paymentsService.fundPaymentIntent>) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => action(id, accessToken!),
    onSuccess: (intent) => {
      // Instant row update from the authoritative response, then refresh the
      // ledgers whose held/released totals moved with it.
      queryClient.setQueryData(paymentKeys.intent(intent.id), intent);
      return invalidateFor(queryClient, 'payments.intent-action', intent.id);
    },
  });
}

export function useFundPaymentIntent() {
  return useIntentAction(paymentsService.fundPaymentIntent);
}

export function useReleasePaymentIntent() {
  return useIntentAction(paymentsService.releasePaymentIntent);
}

export function useRefundPaymentIntent() {
  return useIntentAction(paymentsService.refundPaymentIntent);
}
