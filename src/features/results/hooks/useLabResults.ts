import { useQuery } from '@tanstack/react-query';
import * as resultsService from '../../../services/results-service';
import { useAuthStore } from '../../../store/auth-store';

const MY_RESULTS_QUERY_KEY = ['results', 'mine'] as const;

function resultQueryKey(id: string) {
  return ['results', 'detail', id] as const;
}

/** Signed-in patient's lab results, most recent first (backend order). */
export function useMyLabResults() {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: MY_RESULTS_QUERY_KEY,
    queryFn: () => resultsService.listMyLabResults(accessToken!),
    enabled: Boolean(accessToken),
  });
}

/** One lab result by id (patient-scoped on the backend). */
export function useLabResult(id: string | null | undefined) {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: resultQueryKey(id ?? ''),
    queryFn: () => resultsService.getLabResult(id!, accessToken!),
    enabled: Boolean(accessToken && id),
  });
}
