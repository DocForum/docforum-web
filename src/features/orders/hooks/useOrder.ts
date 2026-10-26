import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as ordersService from '../../../services/orders-service';
import { orderKeys } from '../../../query-keys';
import { useAuthStore } from '../../../store/auth-store';
import { invalidateFor } from '../../../invalidations';
import type { ConfirmReceiptInput, ReportProblemInput } from '../../../types/models';

/** Fetches a single order by id. Disabled when accessToken or id is absent. */
export function useOrder(id: string | null) {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: orderKeys.detail(id ?? ''),
    queryFn: () => ordersService.getOrder(id!, accessToken!),
    enabled: Boolean(accessToken && id),
  });
}

/** Patient confirms receipt of a fulfilled order (issue #35). */
export function useConfirmReceipt() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ConfirmReceiptInput) =>
      ordersService.confirmReceipt(input, accessToken!),
    onSuccess: (_data, variables) => {
      return invalidateFor(queryClient, 'order.confirm-action', variables.orderId);
    },
  });
}

/** Patient reports a problem with a fulfilled order (issue #35). */
export function useReportProblem() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ReportProblemInput) =>
      ordersService.reportProblem(input, accessToken!),
    onSuccess: (_data, variables) => {
      return invalidateFor(queryClient, 'order.confirm-action', variables.orderId);
    },
  });
}
