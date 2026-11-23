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

/** Filter identifiers only — the visible labels come from the catalogue. */
export const AVAILABILITY_OPTIONS: AvailabilityFilter[] = ['any', 'week', 'today'];

/** Stable notice ids: the view maps each one to a static catalogue message. */
export type SearchNoticeId = 'invalidSymptom' | 'invalidAvailability';

/** Slugs come from the backend's controlled vocabulary, so a conservative
 * pattern is safe: lowercase words joined by single hyphens. */
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_SLUG_LENGTH = 64;

export interface ParsedSearch {
  filters: SearchFilters;
  /** Ids for invalid params that were dropped; the view translates them. */
  issues: SearchNoticeId[];
}

const AVAILABILITY_VALUES: AvailabilityFilter[] = ['any', 'week', 'today'];

export function parseSearchParams(params: URLSearchParams): ParsedSearch {
  const issues: SearchNoticeId[] = [];
  const filters: SearchFilters = { ...EMPTY_FILTERS };

  const rawSymptom = params.get('symptom');
  if (rawSymptom) {
    const slug = rawSymptom.trim().toLowerCase();
    if (slug.length <= MAX_SLUG_LENGTH && SLUG_PATTERN.test(slug)) {
      filters.symptomSlug = slug;
    } else {
      issues.push('invalidSymptom');
    }
  }

  const rawAvailability = params.get('availability');
  if (rawAvailability !== null) {
    if (AVAILABILITY_VALUES.includes(rawAvailability as AvailabilityFilter)) {
      filters.availability = rawAvailability as AvailabilityFilter;
    } else {
      issues.push('invalidAvailability');
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
