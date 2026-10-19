// The payment intent attached to a patient's order (issue #61), or null
// when the order has none — in that case the panel simply doesn't render.
// The lookup itself is an assumed contract (ARCHITECTURE_ESSENTIALS.md).
import { useQuery } from '@tanstack/react-query';
import { getPaymentIntentForOrder } from '../../../services/payments-service';
import { useAuthStore } from '../../../store/auth-store';

export function useOrderPaymentIntent(orderId: string | undefined) {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: ['payment-intent', 'order', orderId],
    queryFn: () => getPaymentIntentForOrder(orderId!, accessToken!),
    enabled: Boolean(orderId && accessToken),
    retry: false,
  });
}
