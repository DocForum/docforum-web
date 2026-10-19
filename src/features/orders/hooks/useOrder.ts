// Patient order fetch (issue #61). The contract is assumed — see
// services/orders-service.ts and ARCHITECTURE_ESSENTIALS.md.
import { useQuery } from '@tanstack/react-query';
import { getPatientOrder } from '../../../services/orders-service';
import { useAuthStore } from '../../../store/auth-store';

export function useOrder(orderId: string | undefined) {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: ['order', orderId],
    queryFn: () => getPatientOrder(orderId!, accessToken!),
    enabled: Boolean(orderId && accessToken),
    retry: false,
  });
}
