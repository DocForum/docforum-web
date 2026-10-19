import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../../store/auth-store';
import { getSymptomMapping } from '../../../services/search-service';
import type { SymptomSpecialtyMapping } from '../../../types/models';

/** Which specialties treat the applied symptom (docforum-core#60). */
export function useSymptomMapping(slug: string | null) {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery<SymptomSpecialtyMapping>({
    queryKey: ['symptom-mapping', slug],
    queryFn: ({ signal }) => getSymptomMapping(slug as string, accessToken, signal),
    enabled: Boolean(slug),
    // A slug that fell out of the vocabulary stays a 404 — retrying it
    // only delays the "we don't recognise that symptom" message.
    retry: false,
  });
}
