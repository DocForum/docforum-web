import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../../store/auth-store';
import { searchDoctors } from '../../../services/search-service';
import type { AvailabilityFilter, DoctorSearchResult } from '../../../types/models';

/**
 * Doctors in the given specialties, filtered by availability. Disabled
 * (and silent) until at least one specialty is known — an unfiltered
 * "every doctor" request is never sent, so a symptom page can't degrade
 * into a full directory listing on a mapping failure.
 */
export function useDoctorSearch(specialtyIds: string[], availability: AvailabilityFilter) {
  const accessToken = useAuthStore((state) => state.accessToken);

  // Sorted so the query key doesn't churn if the mapping changes order.
  const sortedIds = [...specialtyIds].sort();
  const idsKey = sortedIds.join(',');

  return useQuery<DoctorSearchResult[]>({
    queryKey: ['doctor-search', idsKey, availability],
    queryFn: ({ signal }) =>
      searchDoctors({ specialtyIds: sortedIds, availability }, accessToken, signal),
    enabled: sortedIds.length > 0,
  });
}
