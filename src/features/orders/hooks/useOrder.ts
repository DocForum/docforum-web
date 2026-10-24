import { useQuery } from '@tanstack/react-query';
import * as ordersService from '../../../services/orders-service';
import { useAuthStore } from '../../../store/auth-store';

export function orderQueryKey(id: string) {
  return ['orders', 'detail', id] as const;
}

/** Fetches a single order by id. Disabled when accessToken or id is absent. */
export function useOrder(id: string | null) {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: orderQueryKey(id ?? ''),
    queryFn: () => ordersService.getOrder(id!, accessToken!),
    enabled: Boolean(accessToken && id),
  });
}
