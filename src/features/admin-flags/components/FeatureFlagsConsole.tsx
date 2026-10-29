import { useCallback, useId, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { EmptyState } from '../../../components/states/EmptyState';
import { InlineError } from '../../../components/states/InlineError';
import { Skeleton } from '../../../components/states/Skeleton';
import { useFeatureFlags, useFlagHistory, useSavingFlagKeys, useUpdateFeatureFlag } from '../hooks/useFeatureFlags';
import { applyUpdate, draftFromFlag } from '../draft';
import { describeListError, describeSaveError } from '../errors';
import {
  KIND_LABELS,
  STATE_FILTERS,
  STATE_LABELS,
  auditTrailLink,
  countByState,
  describeAudience,
  filterFlags,
  flagState,
  latestChangeByFlag,
  parseFlagSearch,
  toFlagSearch,
} from '../flags';
import { FlagCard } from './FlagCard';
import { FlagChangeDialog } from './FlagChangeDialog';
import type { FlagFilters, KindFilter } from '../flags';
import type { LastChange } from './LastChanged';
import type { UpdateFlagVariables } from '../hooks/useFeatureFlags';
import type { FeatureFlag } from '../../../types/models';
import styles from './FeatureFlags.module.css';

type OpenDialog = { mode: 'edit' | 'toggle'; flag: FeatureFlag } | null;

interface Notice {
  tone: 'success' | 'warning' | 'error';
  message: string;
  flagId?: string;
}

const NOTICE_CLASS = {
  success: styles.noticeSuccess,
  warning: styles.noticeWarning,
  error: styles.noticeError,
};

/**
 * Admin console for docforum-core's feature flags (staged rollouts such as
 * wallet payments or 2FA enforcement). Every change goes through a review
 * step and is saved optimistically: the list moves at once and a failed save
 * puts that flag back. Search and filters apply to the loaded list and live
 * in the URL.
 */
export function FeatureFlagsConsole() {
  const titleId = useId();
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useMemo(() => parseFlagSearch(searchParams), [searchParams]);
  const [openDialog, setOpenDialog] = useState<OpenDialog>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  const flags = useFeatureFlags();
  const history = useFlagHistory();
  const update = useUpdateFeatureFlag();
  const savingKeys = useSavingFlagKeys();
  const now = flags.dataUpdatedAt || Date.now();

  const all = useMemo(() => flags.data ?? [], [flags.data]);
  const narrowed = useMemo(() => filterFlags(all, filters), [all, filters]);
  const visible = filters.state === 'all' ? narrowed : narrowed.filter((flag) => flagState(flag) === filters.state);
  const counts = useMemo(() => countByState(narrowed), [narrowed]);

  const latest = useMemo(() => latestChangeByFlag(history.data?.items ?? []), [history.data]);
  const lastChangeFor = useCallback(
    (flag: FeatureFlag): LastChange => {
      if (history.isLoading) return { status: 'loading' };
      if (history.error || !history.data) return { status: 'unavailable' };
      const event = latest.get(flag.id);
      if (event) return { status: 'found', event };
      return history.data.nextCursor ? { status: 'older' } : { status: 'none' };
    },
    [history.isLoading, history.error, history.data, latest],
  );

  const updateFilters = (patch: Partial<FlagFilters>) => {
    setSearchParams(toFlagSearch({ ...filters, ...patch }), { replace: true });
  };

  const handleConfirm = async (variables: UpdateFlagVariables) => {
    setOpenDialog(null);
    setNotice(null);
    try {
      const saved = await update.mutateAsync(variables);
      const shown = saved?.key ? saved : applyUpdate(variables.flag, variables.input);
      setNotice({ tone: 'success', message: `${shown.key} saved. ${describeAudience(shown)}`, flagId: shown.id });
    } catch (error) {
      const failure = describeSaveError(error, variables.flag.key);
      setNotice({
        tone: failure.kind === 'conflict' ? 'warning' : 'error',
        message: failure.message,
        flagId: variables.flag.id,
      });
    }
  };

  let body;
  if (flags.isLoading) {
    body = <Skeleton lines={4} height="2.5rem" label="Loading feature flags" />;
  } else if (flags.error) {
    body = (
      <InlineError
        title="Flags couldn't be loaded"
        message={describeListError(flags.error)}
        onRetry={() => void flags.refetch()}
      />
    );
  } else if (visible.length === 0) {
    body = (
      <EmptyState
        title={
          all.length === 0
            ? 'No feature flags are defined in this environment yet.'
            : 'No flags match these filters.'
        }
        description={
          all.length === 0
            ? 'Flags created in docforum-core appear here with their rollout and targeting.'
            : 'Clear the search or filters to see every flag in this environment.'
        }
        action={
          all.length === 0
            ? { label: 'Refresh flags', onClick: () => void flags.refetch() }
            : {
                label: 'Clear filters',
                onClick: () => updateFilters({ query: '', kind: 'all', state: 'all' }),
              }
        }
      />
    );
  } else {
    body = (
      <ul className={styles.list}>
        {visible.map((flag) => (
          <li key={flag.key}>
            <FlagCard
              flag={flag}
              lastChange={lastChangeFor(flag)}
              now={now}
              saving={savingKeys.has(flag.key)}
              onToggle={(target) => setOpenDialog({ mode: 'toggle', flag: target })}
              onEdit={(target) => setOpenDialog({ mode: 'edit', flag: target })}
            />
          </li>
        ))}
      </ul>
    );
  }

  const filtered = filters.query.trim() !== '' || filters.kind !== 'all' || filters.state !== 'all';

  return (
    <section className={styles.console} aria-labelledby={titleId}>
      <header>
        <h1 id={titleId} className={styles.title}>
          Feature flags
        </h1>
        <p className={styles.subtitle}>
          Staged rollouts served by docforum-core in this environment. Changes take effect for users as soon as they
          are saved, and every change is recorded in the audit trail under your account.
        </p>
      </header>

      <div className={styles.toolbar}>
        <div className={styles.toolbarFields}>
          <label className={styles.searchField}>
            <span className={styles.fieldLabel}>Search</span>
            <input
              type="search"
              className={styles.input}
              placeholder="Key or description"
              value={filters.query}
              maxLength={100}
              onChange={(event) => updateFilters({ query: event.target.value })}
            />
          </label>
          <label className={styles.selectField}>
            <span className={styles.fieldLabel}>Type</span>
            <select
              className={styles.select}
              value={filters.kind}
              onChange={(event) => updateFilters({ kind: event.target.value as KindFilter })}
            >
              <option value="all">All types</option>
              {Object.entries(KIND_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className={styles.stateFilter} role="group" aria-label="Filter by state">
          {STATE_FILTERS.map((key) => (
            <button
              key={key}
              type="button"
              className={styles.chip}
              aria-pressed={filters.state === key}
              onClick={() => updateFilters({ state: key })}
            >
              {key === 'all' ? 'All' : STATE_LABELS[key]}
              <span className={styles.chipCount}>{counts[key]}</span>
            </button>
          ))}
        </div>
      </div>

      {notice && (
        <div className={NOTICE_CLASS[notice.tone]} role={notice.tone === 'error' ? 'alert' : 'status'}>
          <p>
            {notice.message}
            {notice.flagId && (
              <>
                {' '}
                <Link to={auditTrailLink(notice.flagId)}>View in audit trail</Link>
              </>
            )}
          </p>
          <button type="button" className={styles.dismiss} onClick={() => setNotice(null)} aria-label="Dismiss">
            ×
          </button>
        </div>
      )}

      {!flags.isLoading && !flags.error && all.length > 0 && (
        <div className={styles.summaryRow}>
          <p className={styles.summary} aria-live="polite">
            {filtered ? `${visible.length} of ${all.length} flags` : `${all.length} ${all.length === 1 ? 'flag' : 'flags'}`}
            {flags.isFetching && ' · updating…'}
          </p>
          {filtered && (
            <button type="button" className={styles.clearFilters} onClick={() => setSearchParams({}, { replace: true })}>
              Clear filters
            </button>
          )}
        </div>
      )}

      {body}

      {openDialog && (
        <FlagChangeDialog
          // A fresh dialog per flag and mode, so no draft leaks between them.
          key={`${openDialog.mode}:${openDialog.flag.key}`}
          flag={openDialog.flag}
          liveFlag={all.find((flag) => flag.key === openDialog.flag.key)}
          lastChange={lastChangeFor(openDialog.flag)}
          now={now}
          startAt={openDialog.mode === 'toggle' ? 'review' : 'edit'}
          initialDraft={
            openDialog.mode === 'toggle'
              ? { ...draftFromFlag(openDialog.flag), enabled: !openDialog.flag.enabled }
              : undefined
          }
          onClose={() => setOpenDialog(null)}
          onConfirm={(variables) => void handleConfirm(variables)}
        />
      )}
    </section>
  );
}
