// URL state for the doctor/symptom search page (issue #30). Everything the
// page shows is derivable from the URL: the applied symptom (its controlled-
// vocabulary slug) and the availability filter. Values parsed out of the URL
// are validated — a hand-edited or stale link drops the invalid part with a
// visible notice instead of firing a request the backend would reject.
import type { AvailabilityFilter } from '../../types/models';

export interface SearchFilters {
  /** The controlled-vocabulary slug of the applied symptom, '' when none. */
  symptomSlug: string;
  availability: AvailabilityFilter;
}

export const EMPTY_FILTERS: SearchFilters = { symptomSlug: '', availability: 'any' };

export const AVAILABILITY_OPTIONS: { value: AvailabilityFilter; label: string }[] = [
  { value: 'any', label: 'Any time' },
  { value: 'week', label: 'This week' },
  { value: 'today', label: 'Today' },
];

/** Slugs come from the backend's controlled vocabulary, so a conservative
 * pattern is safe: lowercase words joined by single hyphens. */
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_SLUG_LENGTH = 64;

export interface ParsedSearch {
  filters: SearchFilters;
  /** Human-readable notices for invalid params that were dropped. */
  issues: string[];
}

const AVAILABILITY_VALUES: AvailabilityFilter[] = ['any', 'week', 'today'];

export function parseSearchParams(params: URLSearchParams): ParsedSearch {
  const issues: string[] = [];
  const filters: SearchFilters = { ...EMPTY_FILTERS };

  const rawSymptom = params.get('symptom');
  if (rawSymptom) {
    const slug = rawSymptom.trim().toLowerCase();
    if (slug.length <= MAX_SLUG_LENGTH && SLUG_PATTERN.test(slug)) {
      filters.symptomSlug = slug;
    } else {
      issues.push('That symptom link was not valid, so the symptom was cleared.');
    }
  }

  const rawAvailability = params.get('availability');
  if (rawAvailability !== null) {
    if (AVAILABILITY_VALUES.includes(rawAvailability as AvailabilityFilter)) {
      filters.availability = rawAvailability as AvailabilityFilter;
    } else {
      issues.push('That availability filter was not valid, so it was reset to “Any time”.');
    }
  }

  return { filters, issues };
}

/** Omits defaults, so the URL stays as short as the state it describes. */
export function toSearchParams(filters: SearchFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.symptomSlug) params.set('symptom', filters.symptomSlug);
  if (filters.availability !== 'any') params.set('availability', filters.availability);
  return params;
}
