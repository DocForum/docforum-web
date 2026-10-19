import { useMutation } from '@tanstack/react-query';
import { useAuthStore } from '../../../store/auth-store';
import { verifyOrderToken } from '../../../services/order-verify-service';
import type { VerifyOrderResponse } from '../../../types/models';

export function useOrderVerify() {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useMutation<VerifyOrderResponse, Error, string>({
    mutationFn: (orderToken: string) => {
      if (!accessToken) {
        throw new Error('Not authenticated');
      }
      return verifyOrderToken(orderToken, accessToken);
    },
  });
}
