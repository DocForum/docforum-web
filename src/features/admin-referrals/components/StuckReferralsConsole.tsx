import { useCallback, useId, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '../../../components/Button';
import { EmptyState } from '../../../components/states/EmptyState';
import { InlineError } from '../../../components/states/InlineError';
import { Skeleton } from '../../../components/states/Skeleton';
import { useOptionalT } from '../../../i18n/useOptionalT';
import { useStuckReferrals } from '../hooks/useStuckReferrals';
import { describeQueueError } from '../errors';
import {
  REASON_KEYS,
  STUCK_AGES,
  parseQueueSearch,
  reasonLabel,
  sortByAge,
  stuckAgeLabel,
  toQueueSearch,
} from '../queue';
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
  const t = useOptionalT().t;
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
    body = (
      <Skeleton
        lines={5}
        height="2rem"
        label={t('adminReferrals.loading', 'Loading stuck referrals')}
      />
    );
  } else if (queue.error) {
    body = (
      <InlineError
        title={t('adminReferrals.loadErrorTitle', "The referral queue couldn't be loaded")}
        message={describeQueueError(queue.error, t)}
        onRetry={() => void queue.refetch()}
      />
    );
  } else if (visible.length === 0) {
    const threshold = STUCK_AGES.find((age) => age.value === filters.olderThan)
      ? stuckAgeLabel(filters.olderThan, t)
      : null;
    body = (
      <EmptyState
        title={
          loaded.length === 0
            ? t(
                'adminReferrals.empty.nonePending',
                'No referrals have been pending for more than {threshold}. Nobody is stuck.',
                { threshold: threshold ?? '' },
              )
            : t(
                'adminReferrals.empty.noneFlagged',
                'None of the loaded referrals are flagged “{reason}”.',
                {
                  reason:
                    filters.reason === 'all'
                      ? ''
                      : reasonLabel(filters.reason as StuckReferralReason, t),
                },
              )
        }
        description={t(
          'adminReferrals.empty.description',
          'Widen the age threshold or clear the reason filter to see more of the queue.',
        )}
        action={{
          label: t('adminReferrals.empty.reload', 'Reload the queue'),
          onClick: () => void queue.refetch(),
        }}
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

  const flaggedReason =
    filters.reason === 'all' ? null : reasonLabel(filters.reason as StuckReferralReason, t);

  return (
    <section className={styles.console} aria-labelledby={titleId}>
      <header>
        <h1 id={titleId} className={styles.title}>
          {t('adminReferrals.title', 'Stuck referrals')}
        </h1>
        <p className={styles.subtitle}>
          {t(
            'adminReferrals.subtitle',
            'Referrals still pending after the threshold below, oldest first. Each one is a patient waiting between doctors. Reassigning or cancelling is recorded in the audit trail with your reason.',
          )}
        </p>
      </header>

      <div className={styles.toolbar}>
        <label className={styles.selectField}>
          <span className={styles.fieldLabel}>{t('adminReferrals.pendingFor', 'Pending for at least')}</span>
          <select
            className={styles.select}
            value={filters.olderThan}
            onChange={(event) => updateFilters({ olderThan: event.target.value as StuckAge })}
          >
            {STUCK_AGES.map((age) => (
              <option key={age.value} value={age.value}>
                {stuckAgeLabel(age.value, t)}
              </option>
            ))}
          </select>
        </label>

        <div className={styles.reasonFilter} role="group" aria-label={t('adminReferrals.filterByReason', 'Filter by reason')}>
          {(['all', ...REASON_KEYS] as ReasonFilter[]).map((key) => (
            <button
              key={key}
              type="button"
              className={styles.chip}
              aria-pressed={filters.reason === key}
              onClick={() => updateFilters({ reason: key })}
            >
              {key === 'all' ? t('adminReferrals.all', 'All') : reasonLabel(key, t)}
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
                  {t('adminReferrals.viewInAudit', 'View in audit trail')}
                </Link>
              </>
            )}
          </p>
          <button
            type="button"
            className={styles.dismiss}
            onClick={() => setNotice(null)}
            aria-label={t('adminReferrals.dismiss', 'Dismiss')}
          >
            ×
          </button>
        </div>
      )}

      {!queue.isLoading && !queue.error && loaded.length > 0 && (
        <p className={styles.summary} aria-live="polite">
          {flaggedReason
            ? t('adminReferrals.summary.filtered', '{visible} of {loaded} loaded referrals flagged “{reason}”', {
                visible: visible.length,
                loaded: loaded.length,
                reason: flaggedReason,
              })
            : t(
                'adminReferrals.summary.loaded',
                '{count, plural, one {# stuck referral loaded} other {# stuck referrals loaded}}',
                { count: loaded.length },
              )}
          {queue.isFetching && !queue.isFetchingNextPage && ` · ${t('adminReferrals.updating', 'updating…')}`}
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
            {queue.isFetchingNextPage ? t('adminReferrals.loadingMore', 'Loading…') : t('adminReferrals.loadMore', 'Load more')}
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
              message: t(
                'adminReferrals.notice.reassigned',
                'Referral {referralId} reassigned to {doctorName}.',
                { referralId: shortId(openAction.referral.id), doctorName: doctor.fullName },
              ),
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
              message: t(
                'adminReferrals.notice.cancelled',
                'Referral {referralId} cancelled. docforum-core will notify the patient.',
                { referralId: shortId(openAction.referral.id) },
              ),
              referralId: openAction.referral.id,
            });
          }}
        />
      )}
    </section>
  );
}
