import { useCallback, useId, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '../../../components/Button';
import { EmptyState } from '../../../components/states/EmptyState';
import { InlineError } from '../../../components/states/InlineError';
import { Skeleton } from '../../../components/states/Skeleton';
import { useStuckReferrals } from '../hooks/useStuckReferrals';
import { describeQueueError } from '../errors';
import { REASONS, STUCK_AGES, parseQueueSearch, sortByAge, toQueueSearch } from '../queue';
import { CancelReferralDialog } from './CancelReferralDialog';
import { ReassignDialog } from './ReassignDialog';
import { StuckReferralCard } from './StuckReferralCard';
import type { QueueFilters, ReasonFilter } from '../queue';
import type { StuckAge } from '../../../services/admin-referrals-service';
import type { StuckReferral, StuckReferralReason } from '../../../types/models';
import styles from './StuckReferrals.module.css';

type OpenAction = { kind: 'reassign' | 'cancel'; referral: StuckReferral } | null;

interface Notice {
  tone: 'success' | 'warning';
  message: string;
  /** Links the notice to the referral's history in the audit trail. */
  referralId?: string;
}

const REASON_KEYS = Object.keys(REASONS) as StuckReferralReason[];

function shortId(id: string): string {
  return id.length > 8 ? `${id.slice(0, 8)}…` : id;
}

/**
 * Admin queue of referrals pending past a threshold — patients stuck
 * between doctors. Each can be reassigned to an eligible doctor or
 * cancelled; both need a reason, which docforum-core records in the audit
 * trail. The age threshold is a server filter; the reason filter applies to
 * what's loaded, since docforum-core#68 doesn't define one.
 */
export function StuckReferralsConsole() {
  const titleId = useId();
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useMemo(() => parseQueueSearch(searchParams), [searchParams]);
  const [openAction, setOpenAction] = useState<OpenAction>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  const queue = useStuckReferrals(filters.olderThan);
  const loaded = useMemo(() => sortByAge(queue.data?.pages.flatMap((page) => page.items) ?? []), [queue.data]);
  const visible = filters.reason === 'all' ? loaded : loaded.filter((r) => r.stuckReason === filters.reason);
  // Ages are shown as of the last fetch, so they agree with what the server judged stuck.
  const now = queue.dataUpdatedAt || Date.now();

  const counts = useMemo(() => {
    const byReason = Object.fromEntries(REASON_KEYS.map((key) => [key, 0])) as Record<StuckReferralReason, number>;
    for (const referral of loaded) if (referral.stuckReason in byReason) byReason[referral.stuckReason] += 1;
    return byReason;
  }, [loaded]);

  const updateFilters = (patch: Partial<QueueFilters>) => {
    setSearchParams(toQueueSearch({ ...filters, ...patch }), { replace: true });
  };

  const closeDialog = useCallback(() => setOpenAction(null), []);
  const handleConflict = useCallback((message: string) => {
    setOpenAction(null);
    setNotice({ tone: 'warning', message });
  }, []);

  let body;
  if (queue.isLoading) {
    body = <Skeleton lines={5} height="2rem" label="Loading stuck referrals" />;
  } else if (queue.error) {
    body = (
      <InlineError
        title="The referral queue couldn't be loaded"
        message={describeQueueError(queue.error)}
        onRetry={() => void queue.refetch()}
      />
    );
  } else if (visible.length === 0) {
    const threshold = STUCK_AGES.find((age) => age.value === filters.olderThan)?.label;
    body = (
      <EmptyState
        title={
          loaded.length === 0
            ? `No referrals have been pending for more than ${threshold}. Nobody is stuck.`
            : `None of the loaded referrals are flagged “${REASONS[filters.reason as StuckReferralReason].label}”.`
        }
        description="Widen the age threshold or clear the reason filter to see more of the queue."
        action={{ label: 'Reload the queue', onClick: () => void queue.refetch() }}
      />
    );
  } else {
    body = (
      <ul className={styles.list}>
        {visible.map((referral) => (
          <li key={referral.id}>
            <StuckReferralCard
              referral={referral}
              now={now}
              onReassign={(target) => setOpenAction({ kind: 'reassign', referral: target })}
              onCancel={(target) => setOpenAction({ kind: 'cancel', referral: target })}
            />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <section className={styles.console} aria-labelledby={titleId}>
      <header>
        <h1 id={titleId} className={styles.title}>
          Stuck referrals
        </h1>
        <p className={styles.subtitle}>
          Referrals still pending after the threshold below, oldest first. Each one is a patient waiting between
          doctors. Reassigning or cancelling is recorded in the audit trail with your reason.
        </p>
      </header>

      <div className={styles.toolbar}>
        <label className={styles.selectField}>
          <span className={styles.fieldLabel}>Pending for at least</span>
          <select
            className={styles.select}
            value={filters.olderThan}
            onChange={(event) => updateFilters({ olderThan: event.target.value as StuckAge })}
          >
            {STUCK_AGES.map((age) => (
              <option key={age.value} value={age.value}>
                {age.label}
              </option>
            ))}
          </select>
        </label>

        <div className={styles.reasonFilter} role="group" aria-label="Filter by reason">
          {(['all', ...REASON_KEYS] as ReasonFilter[]).map((key) => (
            <button
              key={key}
              type="button"
              className={styles.chip}
              aria-pressed={filters.reason === key}
              onClick={() => updateFilters({ reason: key })}
            >
              {key === 'all' ? 'All' : REASONS[key].label}
              <span className={styles.chipCount}>{key === 'all' ? loaded.length : counts[key]}</span>
            </button>
          ))}
        </div>
      </div>

      {notice && (
        <div className={notice.tone === 'success' ? styles.noticeSuccess : styles.noticeWarning} role="status">
          <p>
            {notice.message}
            {notice.referralId && (
              <>
                {' '}
                <Link to={`/admin/audit?entityType=Referral&entityId=${encodeURIComponent(notice.referralId)}`}>
                  View in audit trail
                </Link>
              </>
            )}
          </p>
          <button type="button" className={styles.dismiss} onClick={() => setNotice(null)} aria-label="Dismiss">
            ×
          </button>
        </div>
      )}

      {!queue.isLoading && !queue.error && loaded.length > 0 && (
        <p className={styles.summary} aria-live="polite">
          {filters.reason === 'all'
            ? `${loaded.length} stuck ${loaded.length === 1 ? 'referral' : 'referrals'} loaded`
            : `${visible.length} of ${loaded.length} loaded referrals flagged “${REASONS[filters.reason].label}”`}
          {queue.isFetching && !queue.isFetchingNextPage && ' · updating…'}
        </p>
      )}

      {body}

      {queue.hasNextPage && (
        <div className={styles.loadMore}>
          <Button
            variant="secondary"
            onClick={() => void queue.fetchNextPage()}
            loading={queue.isFetchingNextPage}
            disabled={queue.isFetching}
          >
            {queue.isFetchingNextPage ? 'Loading…' : 'Load more'}
          </Button>
        </div>
      )}

      {openAction?.kind === 'reassign' && (
        <ReassignDialog
          referral={openAction.referral}
          onClose={closeDialog}
          onConflict={handleConflict}
          onReassigned={(doctor) => {
            setOpenAction(null);
            setNotice({
              tone: 'success',
              message: `Referral ${shortId(openAction.referral.id)} reassigned to ${doctor.fullName}.`,
              referralId: openAction.referral.id,
            });
          }}
        />
      )}
      {openAction?.kind === 'cancel' && (
        <CancelReferralDialog
          referral={openAction.referral}
          onClose={closeDialog}
          onConflict={handleConflict}
          onCancelled={() => {
            setOpenAction(null);
            setNotice({
              tone: 'success',
              message: `Referral ${shortId(openAction.referral.id)} cancelled. docforum-core will notify the patient.`,
              referralId: openAction.referral.id,
            });
          }}
        />
      )}
    </section>
  );
}
