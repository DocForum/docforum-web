import { VERIFICATION_STATUS_LABELS } from '../requirements';
import type { VerificationStatus } from '../../../types/models';
import styles from './VerificationStatusBanner.module.css';

interface Props {
  status: VerificationStatus;
  /** The profile row itself carries no reason (docforum-core's
   * `DoctorProfile` is `{id, userId, fullName, verificationStatus}`), so the
   * page passes the reason it derived from the rejected items. */
  rejectionReason?: string | null;
  fullName?: string;
}

const HEADLINES: Record<VerificationStatus, string> = {
  pending: 'Your application is with a reviewer',
  verified: 'Your doctor account is verified',
  rejected: 'Your application was not approved',
};

const BODIES: Record<VerificationStatus, string> = {
  pending:
    'Nothing more is needed from you right now. Every document and specialty claim below is reviewed individually, so a row can move to verified on its own.',
  verified:
    'You can publish availability and take patients. Keep this page handy — a reviewer can re-open a claim if a document expires.',
  rejected:
    'Read the reason below, correct the matching items, and resubmit them. Resubmitting starts a fresh review; it does not erase the history.',
};

const NO_REASON =
  'No reason was recorded with the decision. Check each rejected document and specialty claim below, correct them, and resubmit.';

export function VerificationStatusBanner({ status, rejectionReason, fullName }: Props) {
  const greeting = fullName ? ` — ${fullName}` : '';

  return (
    <section
      className={styles.banner}
      data-status={status}
      role={status === 'rejected' ? 'alert' : 'status'}
    >
      <span className={styles.pill}>{VERIFICATION_STATUS_LABELS[status]}</span>
      <h2 className={styles.headline}>
        {HEADLINES[status]}
        {greeting}
      </h2>
      <p className={styles.body}>{BODIES[status]}</p>
      {status === 'rejected' && (
        <p className={styles.reason}>
          <span className={styles.reasonLabel}>Reason: </span>
          {rejectionReason || NO_REASON}
        </p>
      )}
    </section>
  );
}
