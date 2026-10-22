import { useCallback, useId, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '../../../components/Button';
import { Spinner } from '../../../components/Spinner';
import { useSpecialtyCatalog, useSpecialtyClaims } from '../hooks/useSpecialtyClaims';
import { describeClaimsQueueError } from '../errors';
import {
  CLAIM_AGES,
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

  let body;
  if (queue.isLoading) {
    body = (
      <div className={styles.status} role="status">
        <Spinner size={20} />
        <span>Loading specialty claims…</span>
      </div>
    );
  } else if (queue.error) {
    body = (
      <div className={styles.errorBox} role="alert">
        <p>{describeClaimsQueueError(queue.error)}</p>
        <Button variant="secondary" onClick={() => void queue.refetch()}>
          Try again
        </Button>
      </div>
    );
  } else if (groups.length === 0) {
    body = (
      <p className={styles.empty}>
        {loaded.length === 0
          ? filters.specialtyId || filters.olderThan
            ? 'No pending claims match these filters.'
            : 'No specialty claims are waiting for review. Every attached specialty has been decided.'
          : 'No claims match these filters.'}
      </p>
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
          Specialty claims
        </h1>
        <p className={styles.subtitle}>
          Each claim below is one doctor asking to be listed and referred into one specialty (PRD §8.1.5). Approving
          lets patients find and be routed to the doctor for that specialty only; rejecting tells the doctor what to
          fix or resubmit. Every decision is recorded in the audit trail — there are no bulk actions, each claim
          deserves a look.
        </p>
      </header>

      <div className={styles.toolbar}>
        <label className={styles.selectField}>
          <span className={styles.fieldLabel}>Specialty</span>
          <select
            className={styles.select}
            value={filters.specialtyId}
            onChange={(event) => updateFilters({ specialtyId: event.target.value })}
          >
            <option value="">All specialties</option>
            {options.map((specialty) => (
              <option key={specialty.id} value={specialty.id}>
                {specialty.name}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.selectField}>
          <span className={styles.fieldLabel}>Claimed at least</span>
          <select
            className={styles.select}
            value={filters.olderThan ?? ''}
            onChange={(event) => updateFilters({ olderThan: (event.target.value || null) as ClaimAge | null })}
          >
            <option value="">Any age</option>
            {CLAIM_AGES.map((age) => (
              <option key={age.value} value={age.value}>
                {age.label}
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
          {groups.length} {groups.length === 1 ? 'doctor' : 'doctors'} · {loaded.length}{' '}
          {loaded.length === 1 ? 'claim' : 'claims'} loaded
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
                  ? `${claim.specialty.name} approved for ${claim.doctor.fullName} — they can now appear in ${claim.specialty.name} search and referrals.`
                  : `${claim.specialty.name} rejected for ${claim.doctor.fullName}. docforum-core tells the doctor what to resubmit.`,
              claimId: claim.id,
            });
          }}
        />
      )}
    </section>
  );
}
