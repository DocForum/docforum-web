import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../../components/Button';
import { FormError } from '../../../components/FormError';
import { Spinner } from '../../../components/Spinner';
import { ApiError } from '../../../services/api-client';
import { useFormat } from '../../../i18n/useFormat';
import { useSentReferrals } from '../hooks/useSentReferrals';
import { isExpiredAndNotified, needsAttention, shortId, sortSentReferrals } from '../sent';
import { ReferralStatusPill } from './ReferralStatusPill';
import type { SentReferral } from '../../../types/models';
import styles from './SentReferrals.module.css';

function targetLabels(referral: SentReferral) {
  const specialty =
    referral.targetSpecialty?.name ??
    (referral.targetSpecialtyId ? `Specialty ${shortId(referral.targetSpecialtyId)}` : 'Specialty not recorded');
  const doctor = referral.targetDoctor?.fullName ?? `Doctor ${shortId(referral.targetDoctorId)}`;
  return { specialty, doctor };
}

function SentReferralItem({ referral }: { referral: SentReferral }) {
  const format = useFormat();
  const { specialty, doctor } = targetLabels(referral);
  const expiredAndNotified = isExpiredAndNotified(referral);
  const loopFlagged = Boolean(referral.loopFlaggedAt);

  return (
    <li className={styles.item}>
      <div className={styles.itemHeader}>
        <div>
          <span className={styles.specialty}>{specialty}</span>
          <span className={styles.doctor}>{doctor}</span>
        </div>
        <ReferralStatusPill status={referral.status} />
      </div>

      {(expiredAndNotified || loopFlagged) && (
        <div className={styles.badges}>
          {expiredAndNotified ? (
            <span className={styles.badge} data-badge="expired-notified">
              Expired after no-shows — you were notified
            </span>
          ) : null}
          {loopFlagged ? (
            <span className={styles.badge} data-badge="loop-flagged">
              Loop flagged
            </span>
          ) : null}
        </div>
      )}

      {loopFlagged && referral.loopFlagReason ? (
        <p className={styles.flagReason}>{referral.loopFlagReason}</p>
      ) : null}

      <p className={styles.meta}>
        Sent <time dateTime={referral.createdAt}>{format.formatRelativeTime(referral.createdAt)}</time>
        {referral.noShowCount > 0 ? (
          <>
            {' · '}
            {referral.noShowCount} missed {referral.noShowCount === 1 ? 'appointment' : 'appointments'}
          </>
        ) : null}
      </p>

      {/* Deliberately no snapshot notes here: they are PHI and the list is a
          triage surface, not the clinical record. The detail page shows them
          to the doctors allowed to read the snapshot. */}
      <Link className={styles.actionLink} to={`/doctor/referrals/${referral.id}?from=sent`}>
        Open referral
      </Link>
    </li>
  );
}

/**
 * "Referrals I've sent" (issue #265): the referring doctor's side of the
 * loop. Core's `/referrals/created` is a flat, unpaginated array, so this
 * renders every row after putting the newest ones that need attention
 * first. Expired-after-no-shows and loop-flagged rows are called out
 * explicitly; target ids fall back to a short prefix when core has not
 * expanded the target doctor/specialty names.
 */
export function SentReferrals() {
  const query = useSentReferrals();
  const items = useMemo(() => sortSentReferrals(query.data ?? []), [query.data]);
  const attentionCount = items.filter(needsAttention).length;

  return (
    <section className={styles.root} aria-labelledby="sent-referrals-heading">
      <h1 id="sent-referrals-heading" className={styles.heading}>
        Referrals I&apos;ve sent
      </h1>
      <p className={styles.intro}>
        Track what happened after you referred a patient. Newest referrals that need your attention appear first.
      </p>

      {query.isPending ? (
        <div className={styles.loading}>
          <Spinner size={24} />
          <span>Loading sent referrals…</span>
        </div>
      ) : null}

      {query.error ? (
        <>
          <FormError
            message={
              query.error instanceof ApiError
                ? query.error.message
                : 'Could not load the referrals you sent. Please try again.'
            }
          />
          <Button variant="secondary" onClick={() => query.refetch()} loading={query.isFetching}>
            Try again
          </Button>
        </>
      ) : null}

      {query.isSuccess && items.length === 0 ? (
        <p className={styles.empty}>You haven&apos;t sent any referrals yet.</p>
      ) : null}

      {items.length > 0 ? (
        <>
          {attentionCount > 0 ? (
            <p className={styles.attention} role="status">
              {attentionCount} {attentionCount === 1 ? 'referral needs' : 'referrals need'} attention.
            </p>
          ) : null}
          <ul className={styles.list}>
            {items.map((referral) => (
              <SentReferralItem key={referral.id} referral={referral} />
            ))}
          </ul>
        </>
      ) : null}
    </section>
  );
}
