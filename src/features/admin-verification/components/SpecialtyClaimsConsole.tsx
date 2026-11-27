import { useCallback, useId, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '../../../components/Button';
import { EmptyState } from '../../../components/states/EmptyState';
import { InlineError } from '../../../components/states/InlineError';
import { Skeleton } from '../../../components/states/Skeleton';
import { useOptionalT } from '../../../i18n/useOptionalT';
import { useSpecialtyCatalog, useSpecialtyClaims } from '../hooks/useSpecialtyClaims';
import { describeClaimsQueueError } from '../errors';
import {
  CLAIM_AGES,
  claimAgeLabel,
  groupClaimsByDoctor,
  parseQueueSearch,
  sortClaims,
  specialtyOptions,
  toQueueSearch,
} from '../claims';
import { DoctorClaimsCard } from './DoctorClaimsCard';
import { ReviewClaimDialog } from './ReviewClaimDialog';
import type { ClaimDecision, SpecialtyClaim } from '../../../types/models';
import type { QueueFilters } from '../claims';
import type { ClaimAge } from '../../../services/admin-verification-service';
import styles from './SpecialtyClaims.module.css';

interface OpenReview {
  claim: SpecialtyClaim;
  decision: ClaimDecision;
}

interface Notice {
  tone: 'success' | 'warning';
  message: string;
  /** Links the notice to the claim's history in the audit trail. */
  claimId?: string;
}

/**
 * Admin queue of pending doctor↔specialty claims (PRD §8.1.5): claims are
 * grouped by doctor, each shown with its supporting document, and approved
 * or rejected individually — no bulk actions, every claim deserves a look.
 * Both filters are server-side; `specialtyId` and `olderThan` live in the
 * URL so a filtered view is shareable.
 */
export function SpecialtyClaimsConsole() {
  const t = useOptionalT().t;
  const titleId = useId();
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useMemo(() => parseQueueSearch(searchParams), [searchParams]);
  const [openReview, setOpenReview] = useState<OpenReview | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  const queue = useSpecialtyClaims(filters.specialtyId, filters.olderThan);
  const catalog = useSpecialtyCatalog();

  const loaded = useMemo(() => sortClaims(queue.data?.pages.flatMap((page) => page.items) ?? []), [queue.data]);
  const groups = useMemo(() => groupClaimsByDoctor(loaded), [loaded]);
  // Ages are shown as of the last fetch, so they agree with what the server judged age on.
  const now = queue.dataUpdatedAt || Date.now();

  const options = useMemo(() => {
    const fromCatalog = catalog.data ?? [];
    const byId = new Map(fromCatalog.map((specialty) => [specialty.id, specialty]));
    for (const specialty of specialtyOptions(loaded, filters.specialtyId)) byId.set(specialty.id, specialty);
    return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [catalog.data, loaded, filters.specialtyId]);

  const updateFilters = (patch: Partial<QueueFilters>) => {
    setSearchParams(toQueueSearch({ ...filters, ...patch }), { replace: true });
  };

  const closeDialog = useCallback(() => setOpenReview(null), []);
  const handleConflict = useCallback((message: string) => {
    setOpenReview(null);
    setNotice({ tone: 'warning', message });
  }, []);

  const filtered = Boolean(filters.specialtyId || filters.olderThan);

  let body;
  if (queue.isLoading) {
    body = <Skeleton lines={5} height="2.5rem" label={t('adminVerification.claims.loading', 'Loading specialty claims')} />;
  } else if (queue.error) {
    body = (
      <InlineError
        title={t('adminVerification.claims.loadErrorTitle', "Specialty claims couldn't be loaded")}
        message={describeClaimsQueueError(queue.error, t)}
        onRetry={() => void queue.refetch()}
      />
    );
  } else if (groups.length === 0) {
    body = (
      <EmptyState
        title={
          loaded.length === 0
            ? filtered
              ? t('adminVerification.claims.emptyFiltered', 'No pending claims match these filters.')
              : t(
                  'adminVerification.claims.emptyTitle',
                  'No specialty claims are waiting for review. Every attached specialty has been decided.',
                )
            : t('adminVerification.claims.emptyFiltered', 'No pending claims match these filters.')
        }
        description={
          loaded.length === 0 && !filtered
            ? t(
                'adminVerification.claims.emptyDescription',
                'When a doctor claims a specialty, it will appear here for review.',
              )
            : t('adminVerification.claims.adjustFilters', 'Try adjusting or clearing the filters above.')
        }
        action={
          filtered
            ? {
                label: t('adminVerification.claims.resetFilters', 'Reset filters'),
                onClick: () => updateFilters({ specialtyId: '', olderThan: null }),
              }
            : {
                label: t('adminVerification.claims.refresh', 'Refresh queue'),
                onClick: () => void queue.refetch(),
              }
        }
      />
    );
  } else {
    body = (
      <ul className={styles.list}>
        {groups.map((group) => (
          <li key={group.doctorId}>
            <DoctorClaimsCard
              group={group}
              now={now}
              onReview={(claim, decision) => setOpenReview({ claim, decision })}
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
          {t('adminVerification.claims.title', 'Specialty claims')}
        </h1>
        <p className={styles.subtitle}>
          {t(
            'adminVerification.claims.subtitle',
            'Each claim below is one doctor asking to be listed and referred into one specialty (PRD §8.1.5). Approving lets patients find and be routed to the doctor for that specialty only; rejecting tells the doctor what to fix or resubmit. Every decision is recorded in the audit trail — there are no bulk actions, each claim deserves a look.',
          )}
        </p>
      </header>

      <div className={styles.toolbar}>
        <label className={styles.selectField}>
          <span className={styles.fieldLabel}>{t('adminVerification.claims.specialtyLabel', 'Specialty')}</span>
          <select
            className={styles.select}
            value={filters.specialtyId}
            onChange={(event) => updateFilters({ specialtyId: event.target.value })}
          >
            <option value="">{t('adminVerification.claims.allSpecialties', 'All specialties')}</option>
            {options.map((specialty) => (
              <option key={specialty.id} value={specialty.id}>
                {specialty.name}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.selectField}>
          <span className={styles.fieldLabel}>{t('adminVerification.claims.claimedAtLeast', 'Claimed at least')}</span>
          <select
            className={styles.select}
            value={filters.olderThan ?? ''}
            onChange={(event) => updateFilters({ olderThan: (event.target.value || null) as ClaimAge | null })}
          >
            <option value="">{t('adminVerification.claims.anyAge', 'Any age')}</option>
            {CLAIM_AGES.map((age) => (
              <option key={age.value} value={age.value}>
                {claimAgeLabel(age.value, t)}
              </option>
            ))}
          </select>
        </label>
      </div>

      {notice && (
        <div className={notice.tone === 'success' ? styles.noticeSuccess : styles.noticeWarning} role="status">
          <p>
            {notice.message}
            {notice.claimId && (
              <>
                {' '}
                <Link to={`/admin/audit?entityType=DoctorSpecialty&entityId=${encodeURIComponent(notice.claimId)}`}>
                  {t('adminVerification.claims.viewInAudit', 'View in audit trail')}
                </Link>
              </>
            )}
          </p>
          <button
            type="button"
            className={styles.dismiss}
            onClick={() => setNotice(null)}
            aria-label={t('adminVerification.claims.dismiss', 'Dismiss')}
          >
            ×
          </button>
        </div>
      )}

      {!queue.isLoading && !queue.error && loaded.length > 0 && (
        <p className={styles.summary} aria-live="polite">
          {t('adminVerification.claims.summaryDoctors', '{count, plural, one {# doctor} other {# doctors}}', {
            count: groups.length,
          })}{' '}
          ·{' '}
          {t('adminVerification.claims.summaryClaims', '{count, plural, one {# claim} other {# claims}} loaded', {
            count: loaded.length,
          })}
          {queue.isFetching && !queue.isFetchingNextPage && ` · ${t('adminVerification.claims.updating', 'updating…')}`}
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
            {queue.isFetchingNextPage
              ? t('adminVerification.queue.loadingMore', 'Loading…')
              : t('adminVerification.queue.loadMore', 'Load more')}
          </Button>
        </div>
      )}

      {openReview && (
        <ReviewClaimDialog
          claim={openReview.claim}
          initialDecision={openReview.decision}
          onClose={closeDialog}
          onConflict={handleConflict}
          onReviewed={(decision, claim) => {
            setOpenReview(null);
            setNotice({
              tone: 'success',
              message:
                decision === 'approve'
                  ? t(
                      'adminVerification.claims.noticeApproved',
                      '{specialty} approved for {doctor} — they can now appear in {specialty} search and referrals.',
                      { specialty: claim.specialty.name, doctor: claim.doctor.fullName },
                    )
                  : t(
                      'adminVerification.claims.noticeRejected',
                      '{specialty} rejected for {doctor}. docforum-core tells the doctor what to resubmit.',
                      { specialty: claim.specialty.name, doctor: claim.doctor.fullName },
                    ),
              claimId: claim.id,
            });
          }}
        />
      )}
    </section>
  );
}
