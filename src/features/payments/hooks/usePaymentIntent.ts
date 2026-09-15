import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as paymentsService from '../../../services/payments-service';
import type { CreatePaymentIntentInput } from '../../../services/payments-service';
import { useAuthStore } from '../../../store/auth-store';

function intentQueryKey(id: string) {
  return ['payments', 'intent', id] as const;
}

export function usePaymentIntent(id: string | null) {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: intentQueryKey(id ?? ''),
    queryFn: () => paymentsService.getPaymentIntent(id!, accessToken!),
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
    onSuccess: (intent) => queryClient.setQueryData(intentQueryKey(intent.id), intent),
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
