import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../../store/auth-store';
import { searchSymptoms } from '../../../services/search-service';
import type { SymptomSuggestion } from '../../../types/models';

export const SYMPTOM_SUGGEST_DEBOUNCE_MS = 250;
export const MIN_SYMPTOM_QUERY_LENGTH = 2;

/**
 * Debounced autocomplete against the controlled symptom vocabulary.
 *
 * The query key is the *debounced* text, and the queryFn forwards React
 * Query's AbortSignal to the fetch — so when a newer keystroke produces a
 * new key while an older request is still in flight, that older request is
 * aborted rather than racing the new one. The debounce timer itself is
 * cleared on every keystroke/unmount, so a burst of typing is one request.
 */
export function useSymptomSuggestions(query: string, delayMs = SYMPTOM_SUGGEST_DEBOUNCE_MS) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();
  const [debouncedQuery, setDebouncedQuery] = useState(query);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), delayMs);
    return () => clearTimeout(timer);
  }, [query, delayMs]);

  // A different debounced query (or unmount) makes any in-flight
  // suggestions fetch stale — cancel it so its response can never
  // overwrite newer results, and the connection is released immediately.
  useEffect(() => {
    return () => {
      void queryClient.cancelQueries({ queryKey: ['symptom-suggestions'] });
    };
  }, [debouncedQuery, queryClient]);

  const trimmed = debouncedQuery.trim();

  return useQuery<SymptomSuggestion[]>({
    queryKey: ['symptom-suggestions', trimmed],
    queryFn: ({ signal }) => searchSymptoms(trimmed, accessToken, signal),
    enabled: trimmed.length >= MIN_SYMPTOM_QUERY_LENGTH,
    // The vocabulary is curated backend-side and effectively static within
    // a visit — no point re-hitting it for every backspace/retype.
    staleTime: 30_000,
  });
}
