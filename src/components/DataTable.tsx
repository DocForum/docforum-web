import { useCallback, useMemo, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Spinner } from './Spinner';
import styles from './DataTable.module.css';

// ─── Types ──────────────────────────────────────────────────────────────

export type SortDirection = 'asc' | 'desc';

export interface SortState {
  key: string;
  direction: SortDirection;
}

export type FilterType = 'text' | 'select';

export interface FilterDefinition {
  key: string;
  label: string;
  type: FilterType;
  options?: { value: string; label: string }[];
  placeholder?: string;
}

export interface ColumnDefinition<T> {
  key: string;
  header: string;
  sortable?: boolean;
  sortKey?: string;
  render: (row: T) => ReactNode;
  width?: string;
}

export interface DataTableProps<T> {
  /** Unique id for this table instance, used to namespace URL params. */
  id: string;
  /** Accessible table caption (visually hidden). */
  caption: string;
  columns: ColumnDefinition<T>[];
  filters?: FilterDefinition[];
  rows: T[];
  rowKey: (row: T) => string;
  /** Show a loading spinner row when true and rows is empty. */
  isLoading?: boolean;
  /** Error message to display instead of rows. */
  error?: string | null;
  /** Current sort state (null = unsorted). */
  sort: SortState | null;
  onSortChange: (sort: SortState | null) => void;
  /** Current filter values keyed by filter key. */
  filterValues: Record<string, string>;
  onFilterChange: (key: string, value: string) => void;
  /** Whether a previous page exists (cursor trail is not empty). */
  hasPrev: boolean;
  /** Whether more entries exist beyond the current page. */
  hasNext: boolean;
  /** Go back to the previous page. */
  onPrev: () => void;
  /** Load the next page. */
  onNext: () => void;
  /** Total entries loaded across all pages (for the status bar). */
  totalLoaded?: number;
}

// ─── DataTable component ────────────────────────────────────────────────

export function DataTable<T>({
  id,
  caption,
  columns,
  filters,
  rows,
  rowKey,
  isLoading = false,
  error = null,
  sort,
  onSortChange,
  filterValues,
  onFilterChange,
  hasPrev,
  hasNext,
  onPrev,
  onNext,
  totalLoaded,
}: DataTableProps<T>) {
  const handleSort = useCallback(
    (col: ColumnDefinition<T>) => {
      if (!col.sortable) return;
      const key = col.sortKey ?? col.key;
      if (sort?.key === key) {
        if (sort.direction === 'asc') {
          onSortChange({ key, direction: 'desc' });
        } else {
          onSortChange(null);
        }
      } else {
        onSortChange({ key, direction: 'asc' });
      }
    },
    [sort, onSortChange],
  );

  const colCount = columns.length;
  const count = totalLoaded ?? rows.length;

  return (
    <div className={styles.root}>
      {filters && filters.length > 0 ? (
        <div className={styles.toolbar} role="search" aria-label={`${caption} filters`}>
          {filters.map((f) => (
            <div key={f.key} className={styles.filterGroup}>
              <label className={styles.filterLabel} htmlFor={`${id}-filter-${f.key}`}>
                {f.label}
              </label>
              {f.type === 'select' ? (
                <select
                  id={`${id}-filter-${f.key}`}
                  className={styles.filterSelect}
                  value={filterValues[f.key] ?? ''}
                  onChange={(e) => onFilterChange(f.key, e.target.value)}
                >
                  <option value="">All</option>
                  {f.options?.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id={`${id}-filter-${f.key}`}
                  type="text"
                  className={styles.filterInput}
                  placeholder={f.placeholder ?? `Filter by ${f.label.toLowerCase()}`}
                  value={filterValues[f.key] ?? ''}
                  onChange={(e) => onFilterChange(f.key, e.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                />
              )}
            </div>
          ))}
        </div>
      ) : null}

      <div className={styles.statusBar} aria-live="polite">
        <span className={styles.statusCount}>
          {isLoading
            ? 'Loading\u2026'
            : error
              ? 'Error'
              : `${count} ${count === 1 ? 'entry' : 'entries'} loaded`}
        </span>
        <span className={styles.sortHint}>
          {sort ? `Sorted by ${sort.key} ${sort.direction === 'asc' ? 'ascending' : 'descending'}` : 'Not sorted'}
        </span>
      </div>

      <div className={styles.tableWrapper} aria-busy={isLoading}>
        <table className={styles.table}>
          <caption className="visually-hidden">{caption}</caption>
          <thead>
            <tr>
              {columns.map((col) => {
                const sortKey = col.sortKey ?? col.key;
                const isSorted = sort?.key === sortKey;
                const ariaSort = isSorted
                  ? sort.direction === 'asc'
                    ? 'ascending'
                    : 'descending'
                  : 'none';
                return (
                  <th
                    key={col.key}
                    scope="col"
                    aria-sort={ariaSort as 'ascending' | 'descending' | 'none'}
                    style={col.width ? { width: col.width } : undefined}
                  >
                    {col.sortable ? (
                      <button
                        type="button"
                        className={styles.sortButton}
                        onClick={() => handleSort(col)}
                        aria-label={`${col.header}. Activate to sort ${
                          isSorted ? (sort.direction === 'asc' ? 'descending' : 'ascending') : 'ascending'
                        }`}
                      >
                        {col.header}
                        <span className={styles.sortIcon} aria-hidden="true">
                          {isSorted ? (sort.direction === 'asc' ? '\u2191' : '\u2193') : '\u2195'}
                        </span>
                      </button>
                    ) : (
                      col.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {isLoading && rows.length === 0 ? (
              <tr>
                <td colSpan={colCount} className={styles.spinnerCell}>
                  <Spinner size={20} />
                  <span>Loading\u2026</span>
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={colCount} className={styles.errorCell}>
                  {error}
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={colCount} className={styles.emptyCell}>
                  No entries found.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={rowKey(row)}>
                  {columns.map((col) => (
                    <td key={col.key} data-label={col.header}>
                      {col.render(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <nav className={styles.pagination} aria-label={`${caption} pages`}>
        <div className={styles.pagerButtons}>
          <button
            type="button"
            className={styles.sortButton}
            disabled={!hasPrev}
            onClick={onPrev}
            aria-label="Newer entries"
          >
            {'\u2190 Newer'}
          </button>
          <button
            type="button"
            className={styles.sortButton}
            disabled={!hasNext}
            onClick={onNext}
            aria-label="Older entries"
          >
            {'Older \u2192'}
          </button>
        </div>
        <span className={styles.pageInfo}>
          {hasPrev && hasNext
            ? 'Mid-page'
            : hasPrev
              ? 'Oldest page'
              : hasNext
                ? 'Newest page'
                : ''}
        </span>
      </nav>
    </div>
  );
}

// ─── useTableUrlState ────────────────────────────────────────────────────
// Syncs filter values, sort state, and cursor to the URL query string so
// filtered/sorted views are shareable and survive reload.

const MAX_FILTER_LENGTH = 200;
const FILTER_KEY_PATTERN = /^[a-zA-Z0-9_-]+$/;

interface UseTableUrlStateOptions {
  id: string;
  filters: FilterDefinition[];
  defaultSort?: SortState | null;
}

export interface TableUrlState {
  sort: SortState | null;
  filterValues: Record<string, string>;
  cursor: string | null;
  setSort: (sort: SortState | null) => void;
  setFilter: (key: string, value: string) => void;
  setCursor: (cursor: string | null) => void;
}

export function useTableUrlState({ id, filters, defaultSort = null }: UseTableUrlStateOptions): TableUrlState {
  const [searchParams, setSearchParams] = useSearchParams();

  const prefix = `${id}-`;

  const sort = useMemo((): SortState | null => {
    const key = searchParams.get(`${prefix}sort`);
    const dir = searchParams.get(`${prefix}dir`);
    if (key && (dir === 'asc' || dir === 'desc')) {
      if (FILTER_KEY_PATTERN.test(key)) return { key, direction: dir };
    }
    return defaultSort;
  }, [searchParams, prefix, defaultSort]);

  const filterValues = useMemo((): Record<string, string> => {
    const values: Record<string, string> = {};
    for (const f of filters) {
      const raw = searchParams.get(`${prefix}f-${f.key}`);
      if (raw !== null && raw.length <= MAX_FILTER_LENGTH) {
        if (f.type === 'select') {
          const allowed = f.options?.some((o) => o.value === raw);
          if (allowed) values[f.key] = raw;
        } else {
          values[f.key] = raw;
        }
      }
    }
    return values;
  }, [searchParams, prefix, filters]);

  const cursor = useMemo((): string | null => {
    const raw = searchParams.get(`${prefix}cursor`);
    if (raw && raw.length <= 500) return raw;
    return null;
  }, [searchParams, prefix]);

  const setSort = useCallback(
    (newSort: SortState | null) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.delete(`${prefix}sort`);
          next.delete(`${prefix}dir`);
          if (newSort) {
            next.set(`${prefix}sort`, newSort.key);
            next.set(`${prefix}dir`, newSort.direction);
          }
          // Sort change resets the cursor
          next.delete(`${prefix}cursor`);
          return next;
        },
        { replace: false },
      );
    },
    [setSearchParams, prefix],
  );

  const setFilter = useCallback(
    (key: string, value: string) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (value && value.length <= MAX_FILTER_LENGTH) {
            next.set(`${prefix}f-${key}`, value);
          } else {
            next.delete(`${prefix}f-${key}`);
          }
          // Filter change resets the cursor
          next.delete(`${prefix}cursor`);
          return next;
        },
        { replace: false },
      );
    },
    [setSearchParams, prefix],
  );

  const setCursor = useCallback(
    (newCursor: string | null) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (newCursor && newCursor.length <= 500) {
            next.set(`${prefix}cursor`, newCursor);
          } else {
            next.delete(`${prefix}cursor`);
          }
          return next;
        },
        { replace: false },
      );
    },
    [setSearchParams, prefix],
  );

  return { sort, filterValues, cursor, setSort, setFilter, setCursor };
}
