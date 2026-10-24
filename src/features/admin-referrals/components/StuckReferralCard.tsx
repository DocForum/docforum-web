import { Button } from '../../../components/Button';
import { REASONS, ageTone, formatAge, hoursSince } from '../queue';
import { ReferralChain } from './ReferralChain';
import type { StuckReferral } from '../../../types/models';
import { useTimeZone } from '../../../i18n/TimeZoneProvider';
import { formatDateTime } from '../../../i18n/time-zone';
import styles from './StuckReferrals.module.css';

interface StuckReferralCardProps {
  referral: StuckReferral;
  now: number;
  onReassign: (referral: StuckReferral) => void;
  onCancel: (referral: StuckReferral) => void;
}

const TONE_CLASS = {
  elevated: styles.ageElevated,
  high: styles.ageHigh,
  critical: styles.ageCritical,
};

export function StuckReferralCard({ referral, now, onReassign, onCancel }: StuckReferralCardProps) {
  const { timeZone } = useTimeZone();
  const hours = hoursSince(referral.createdAt, now);
  const reason = REASONS[referral.stuckReason];
  const headingId = `referral-${referral.id}`;

  return (
    <article className={styles.card} aria-labelledby={headingId}>
      <div className={styles.cardTop}>
        <div className={styles.badges}>
          {hours !== null && (
            <span className={`${styles.age} ${TONE_CLASS[ageTone(hours)]}`}>Pending {formatAge(hours)}</span>
          )}
          <span className={styles.reason} data-reason={referral.stuckReason}>
            {reason?.label ?? referral.stuckReason}
          </span>
        </div>
        <code className={styles.referralId} title="Referral id">
          {referral.id}
        </code>
      </div>

      <h2 id={headingId} className={styles.specialty}>
        {referral.targetSpecialty.name}
      </h2>
      {reason && <p className={styles.reasonDescription}>{reason.description}</p>}

      <dl className={styles.facts}>
        <div>
          <dt>Referred by</dt>
          <dd>{referral.referringDoctor.fullName}</dd>
        </div>
        <div>
          <dt>Waiting on</dt>
          <dd>{referral.targetDoctor?.fullName ?? <span className={styles.unassigned}>No doctor assigned</span>}</dd>
        </div>
        <div>
          <dt>Referred on</dt>
          <dd>
            <time dateTime={referral.createdAt} title={referral.createdAt}>
              {formatDateTime(referral.createdAt, timeZone)}
            </time>
          </dd>
        </div>
      </dl>

      {referral.stuckReason === 'loop_flagged' && referral.chain && referral.chain.length > 0 && (
        <ReferralChain chain={referral.chain} currentId={referral.id} />
      )}

      <div className={styles.cardActions}>
        <Button type="button" onClick={() => onReassign(referral)} aria-describedby={headingId}>
          Reassign
        </Button>
        <Button type="button" variant="secondary" onClick={() => onCancel(referral)} aria-describedby={headingId}>
          Cancel referral
        </Button>
      </div>
    </article>
  );
}
