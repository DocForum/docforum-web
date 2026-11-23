import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as resultsService from '../../../services/results-service';
import { useAuthStore } from '../../../store/auth-store';
import { resultKeys } from '../../../query-keys';
import type { AbnormalResult } from '../../../types/models';

const PENDING_ABNORMAL_RESULTS_KEY = resultKeys.pendingAbnormal();

export function usePendingAbnormalResults() {
  const accessToken = useAuthStore((state) => state.accessToken);
  return useQuery({
    queryKey: PENDING_ABNORMAL_RESULTS_KEY,
    queryFn: ({ signal }) => resultsService.listPendingAbnormalResults(accessToken!, signal),
    enabled: Boolean(accessToken),
    refetchInterval: 30000,
  });
}

export function useAcknowledgeAbnormalResult() {
  const queryClient = useQueryClient();
  const accessToken = useAuthStore((state) => state.accessToken);

  return useMutation({
    mutationFn: (input: {
      resultId: string;
      note?: string;
    }) => resultsService.acknowledgeAbnormalResult(input.resultId, { note: input.note }, accessToken!),
    onSuccess: (_, variables) => {
      // Remove the acknowledged result from the list
      queryClient.setQueryData<AbnormalResult[]>(
        PENDING_ABNORMAL_RESULTS_KEY,
        (old = []) => old.filter(r => r.id !== variables.resultId)
      );
    },
  });
}
