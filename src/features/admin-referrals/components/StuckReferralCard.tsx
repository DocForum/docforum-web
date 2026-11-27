import { Button } from '../../../components/Button';
import { useOptionalT } from '../../../i18n/useOptionalT';
import { ageTone, formatAge, hoursSince, reasonDescription, reasonLabel } from '../queue';
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
  const t = useOptionalT().t;
  const { timeZone } = useTimeZone();
  const hours = hoursSince(referral.createdAt, now);
  const headingId = `referral-${referral.id}`;

  return (
    <article className={styles.card} aria-labelledby={headingId}>
      <div className={styles.cardTop}>
        <div className={styles.badges}>
          {hours !== null && (
            <span className={`${styles.age} ${TONE_CLASS[ageTone(hours)]}`}>
              {t('adminReferrals.card.pending', 'Pending {age}', { age: formatAge(hours, t) })}
            </span>
          )}
          <span className={styles.reason} data-reason={referral.stuckReason}>
            {reasonLabel(referral.stuckReason, t)}
          </span>
        </div>
        <code className={styles.referralId} title={t('adminReferrals.card.referralIdTitle', 'Referral id')}>
          {referral.id}
        </code>
      </div>

      <h2 id={headingId} className={styles.specialty}>
        {referral.targetSpecialty.name}
      </h2>
      <p className={styles.reasonDescription}>{reasonDescription(referral.stuckReason, t)}</p>

      <dl className={styles.facts}>
        <div>
          <dt>{t('adminReferrals.card.referredBy', 'Referred by')}</dt>
          <dd>{referral.referringDoctor.fullName}</dd>
        </div>
        <div>
          <dt>{t('adminReferrals.card.waitingOn', 'Waiting on')}</dt>
          <dd>
            {referral.targetDoctor?.fullName ?? (
              <span className={styles.unassigned}>{t('adminReferrals.card.noDoctor', 'No doctor assigned')}</span>
            )}
          </dd>
        </div>
        <div>
          <dt>{t('adminReferrals.card.referredOn', 'Referred on')}</dt>
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
          {t('adminReferrals.card.reassign', 'Reassign')}
        </Button>
        <Button type="button" variant="secondary" onClick={() => onCancel(referral)} aria-describedby={headingId}>
          {t('adminReferrals.card.cancel', 'Cancel referral')}
        </Button>
      </div>
    </article>
  );
}
