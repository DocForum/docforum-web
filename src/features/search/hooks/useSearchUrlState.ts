import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { EMPTY_FILTERS, parseSearchParams, toSearchParams } from '../search-params';
import type { SearchFilters } from '../search-params';
import type { AvailabilityFilter } from '../../../types/models';

/** The applied symptom and the availability filter live in the URL, so a
 * search is shareable and survives back/forward — same pattern as the
 * admin audit console's filters. */
export function useSearchUrlState() {
  const [searchParams, setSearchParams] = useSearchParams();

  const { filters, issues } = useMemo(() => parseSearchParams(searchParams), [searchParams]);

  const navigate = useCallback(
    (next: SearchFilters) => setSearchParams(toSearchParams(next)),
    [setSearchParams],
  );

  const selectSymptom = useCallback(
    (slug: string | null) => navigate({ ...filters, symptomSlug: slug ?? '' }),
    [filters, navigate],
  );

  const setAvailability = useCallback(
    (availability: AvailabilityFilter) => navigate({ ...filters, availability }),
    [filters, navigate],
  );

  const clearAll = useCallback(() => navigate(EMPTY_FILTERS), [navigate]);

  return { filters, issues, selectSymptom, setAvailability, clearAll };
}
