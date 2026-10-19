import { useCallback, useMemo } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { EMPTY_FILTERS, parseAuditSearch, toAuditSearch } from '../filters';
import type { AuditFilters, AuditTab, FilterDraft } from '../filters';

// Keyset cursors only point forward (towards older entries), so going back
// a page needs the cursors we came through. They ride along in the history
// entry's state rather than component state: each browser history entry
// then carries its own trail, and back/forward stays consistent with the
// in-page Newer/Older buttons.
type Trail = (string | null)[];

const MAX_TRAIL = 500;

function readTrail(state: unknown): Trail {
  const trail = (state as { auditTrail?: unknown } | null)?.auditTrail;
  if (!Array.isArray(trail) || trail.length > MAX_TRAIL) return [];
  return trail.every((entry) => entry === null || typeof entry === 'string') ? (trail as Trail) : [];
}

export function useAuditFilters() {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();

  const { filters, issues } = useMemo(() => parseAuditSearch(searchParams), [searchParams]);
  const trail = readTrail(location.state);

  const navigate = useCallback(
    (next: AuditFilters, nextTrail: Trail) => {
      setSearchParams(toAuditSearch(next), { state: { auditTrail: nextTrail } });
    },
    [setSearchParams],
  );

  /** Applying filters always starts again from the newest entry. */
  const applyFilters = useCallback(
    (draft: FilterDraft) => navigate({ ...filters, ...draft, cursor: null }, []),
    [filters, navigate],
  );

  const clearFilters = useCallback(() => navigate({ ...EMPTY_FILTERS, tab: filters.tab }, []), [filters.tab, navigate]);

  // Entity/actor/date filters carry over between tabs ("who changed this"
  // → "who viewed this"); cursors are per-endpoint so paging resets.
  const selectTab = useCallback(
    (tab: AuditTab) => {
      if (tab === filters.tab) return;
      navigate({ ...filters, tab, action: '', cursor: null }, []);
    },
    [filters, navigate],
  );

  const goOlder = useCallback(
    (nextCursor: string) => navigate({ ...filters, cursor: nextCursor }, [...trail, filters.cursor]),
    [filters, navigate, trail],
  );

  // With no trail (a shared or bookmarked deep link), "newer" falls back
  // to the newest page rather than guessing.
  const goNewer = useCallback(
    () => navigate({ ...filters, cursor: trail.at(-1) ?? null }, trail.slice(0, -1)),
    [filters, navigate, trail],
  );

  const goNewest = useCallback(() => navigate({ ...filters, cursor: null }, []), [filters, navigate]);

  return {
    filters,
    issues,
    /** 1-based, or null when we arrived mid-list without a trail. */
    pageNumber: filters.cursor === null ? 1 : trail.length > 0 ? trail.length + 1 : null,
    applyFilters,
    clearFilters,
    selectTab,
    goOlder,
    goNewer,
    goNewest,
  };
}
